/**
 * RDAP domain registration lookup service (§6B).
 *
 * @param {string|null} sender_domain - Verified sender domain
 * @returns {Promise<{
 *   exists: boolean,
 *   domainAgeDays: number | null,
 *   registrationDate: string | null,
 *   registrar: string | null,
 *   status: 'OK' | 'NOT_FOUND' | 'UNAVAILABLE'
 * }>}
 */
export async function lookupRdap(sender_domain) {
  if (!sender_domain || typeof sender_domain !== 'string' || !sender_domain.includes('.')) {
    return {
      exists: false,
      domainAgeDays: null,
      registrationDate: null,
      registrar: null,
      status: 'UNAVAILABLE'
    };
  }

  // Clean domain (strip subdomains like mail. or www. if multi-part)
  const cleanDomain = sender_domain.toLowerCase().trim().replace(/^www\./, '');
  const url = `https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/rdap+json, application/json'
      }
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        exists: false,
        domainAgeDays: null,
        registrationDate: null,
        registrar: null,
        status: 'NOT_FOUND'
      };
    }

    if (!response.ok) {
      // 5xx or other status is infra unavailable
      return {
        exists: false,
        domainAgeDays: null,
        registrationDate: null,
        registrar: null,
        status: 'UNAVAILABLE'
      };
    }

    const data = await response.json();

    // Look for registration event
    let registrationDate = null;
    if (Array.isArray(data.events)) {
      const regEvent = data.events.find(e => e.eventAction === 'registration' || e.eventAction === 'created');
      if (regEvent && regEvent.eventDate) {
        registrationDate = regEvent.eventDate;
      }
    }

    let domainAgeDays = null;
    if (registrationDate) {
      const regTimestamp = new Date(registrationDate).getTime();
      if (!isNaN(regTimestamp)) {
        const diffMs = Date.now() - regTimestamp;
        domainAgeDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    // Look for registrar entity
    let registrar = null;
    if (Array.isArray(data.entities)) {
      const registrarEntity = data.entities.find(ent => Array.isArray(ent.roles) && ent.roles.includes('registrar'));
      if (registrarEntity) {
        // Look in vcardArray
        if (Array.isArray(registrarEntity.vcardArray) && Array.isArray(registrarEntity.vcardArray[1])) {
          const fnProp = registrarEntity.vcardArray[1].find(p => p[0] === 'fn');
          if (fnProp && fnProp[3]) {
            registrar = fnProp[3];
          }
        }
        if (!registrar && registrarEntity.handle) {
          registrar = `Registrar ID: ${registrarEntity.handle}`;
        }
      }
    }

    return {
      exists: true,
      domainAgeDays,
      registrationDate,
      registrar,
      status: 'OK'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[RDAP] Lookup for ${cleanDomain} encountered error or timeout:`, err.message);
    // Timeout or network drop is strictly UNAVAILABLE, not NOT_FOUND
    return {
      exists: false,
      domainAgeDays: null,
      registrationDate: null,
      registrar: null,
      status: 'UNAVAILABLE'
    };
  }
}
