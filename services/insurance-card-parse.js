/**
 * @ssot docs/projects/AMENDMENT_18_CLIENTCARE_BILLING_RECOVERY.md
 * Pure parsing for insurance card OCR text — shared by ClientCare ops and tests.
 */

export function cleanExtractedValue(value = '') {
  return String(value || '').replace(/\s+/g, ' ').replace(/[:|]/g, ' ').trim();
}

/** Normalize member ID tokens after OCR — handles OI/Ol/0l/O1 → 01 suffix. */
function normalizeMemberIdChunk(raw = '') {
  let t = cleanExtractedValue(String(raw || ''));
  // Handle common OCR substitutions for the "01" suffix character pair
  t = t.replace(/\bO[IlL1]\b/g, '01');   // OI, Ol, OL, O1 → 01
  t = t.replace(/\b0[lLiI]\b/gi, '01');  // 0l, 0L, 0i, 0I → 01
  const parts = t.split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  // Normalize the main ID token: lowercase L/I → 1, uppercase O → 0 (inside numeric runs)
  const head = parts[0].replace(/(?<=[A-Z\d])[lI]/g, '1').replace(/(?<=\d)O/g, '0');
  if (/^[A-Z]?\d{6,14}$/i.test(head)) {
    // Accept a trailing suffix of 01/00/02 etc
    if (parts[1] && /^(0\d|1)$/i.test(parts[1])) {
      return `${head} ${parts[1]}`.replace(/\s+/g, ' ').trim();
    }
    if (parts.length === 1) return head;
    return head;
  }
  return t;
}

/** Strip trailing field-label words that OCR sometimes runs into a name. */
function cleanSubscriberName(raw = '') {
  return String(raw || '')
    .replace(/\s+(?:Member\s+ID|Member|Group|RxBIN|RxGrp|RxPCN|Hospital|Specialist|Network|Effective|Front|Back|Copay|Deductible|Referral|No\s+Referral|Plan|Coverage|ID)\b.*$/i, '')
    .trim();
}

/**
 * @param {string} text - raw OCR text (multiline)
 * @returns {object} extracted fields + extracted_text + confidence
 */
export function parseInsuranceCardText(text = '') {
  const normalized = String(text || '').replace(/\r/g, '');
  const lines = normalized.split('\n').map((line) => cleanExtractedValue(line)).filter(Boolean);
  const joined = lines.join('\n');

  const capture = (regex) => {
    const match = joined.match(regex);
    return match ? cleanExtractedValue(match[1]) : '';
  };

  // ── Member ID ──────────────────────────────────────────────────────────────
  let memberId = '';
  // Capture ID token — allow optional numeric suffix "01" but stop at non-numeric/non-ID characters
  const memberExplicit =
    joined.match(/member\s*id\s*[:\s]+\s*([A-Z0-9]{6,20}(?:\s+\d{1,2})?)/i)
    || joined.match(/\bID\s*[:\s]+\s*([A-Z0-9][A-Z0-9]{4,18}?(?:\s+\d{1,2})?)(?=\s+(?:Name|Specialist|Hospital|Network|Group|No\b)\b|\s*$)/i);
  if (memberExplicit) {
    memberId = normalizeMemberIdChunk(memberExplicit[1]);
  }
  if (!memberId) {
    memberId =
      capture(/(?:member|subscriber|policy)\s*(?:id|#|number|no\.?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\- ]{4,18}?)(?=\s+(?:Name|Specialist|Group|Hospital|Network)\b|$)/i)
      || capture(/\bID\s*#?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\- ]{4,16}?)(?=\s+Name\b|\s+Specialist\b|\s+Hospital\b|$)/i)
      || capture(/\b([A-Z]\d{7,12}\s+\d{2})\b/)
      || capture(/\b(\d{8,12}\s+\d{2})\b/);
    memberId = normalizeMemberIdChunk(memberId);
  }
  memberId = memberId.replace(/\s+/g, ' ').trim();
  // Second pass: if the ID is present without the 01 suffix, look for it nearby
  const idCore = memberId.replace(/\s+.*$/, '').trim();
  if (idCore && /^[A-Z]?\d{7,12}$/i.test(idCore) && !/\s0[01]\b/.test(memberId)) {
    const escaped = idCore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\s+O[IlL1]\\b`).test(joined) || new RegExp(`\\b${escaped}\\s+0[1lL]\\b`, 'i').test(joined)) {
      memberId = `${idCore} 01`;
    }
  }

  // ── Group number ────────────────────────────────────────────────────────────
  // Require captured value to start with a digit (prevents capturing the word "Number")
  let groupNumber =
    capture(/\b(?:group|grp)\s*(?:no\.?|#|number)?\s*[:\s]+\s*(\d{4,15})\b/i)
    || capture(/\b(?:group|grp)\s*(?:no\.?|#)?\s*[:\-]?\s*(\d{4,15})\b/i)
    // Alphanumeric group IDs (like H55735) — only if it truly starts with a letter+digits
    || capture(/\b(?:group|grp)\s*(?:no\.?|#|number)?\s*[:\s]+\s*([A-Z]\d{4,12})\b/i)
    || capture(/\b(?:group|grp)\s*(?:no\.?|#)?\s*[:\-]?\s*([A-Z]\d{3,10})\b/i)
    || capture(/\b(?:^|\s)(\d{7,8})\s*(?:\n|$)/im);
  groupNumber = String(groupNumber || '').split(/\s+/)[0].trim();
  // Reject if it's just a label word (no digits)
  if (groupNumber && !/\d/.test(groupNumber)) groupNumber = '';

  // ── Subscriber name ────────────────────────────────────────────────────────
  // Check for name BEFORE "Member ID" label (e.g. "AMANDA WINKELS Member ID …")
  const nameBeforeMemberId = joined.match(/([A-Z][A-Z '-]{3,35})\s+Member\s+ID\b/);
  let subscriberName =
    // "subscriber name:" or "insured name:" or "member name:" — require 'name' after 'member'
    capture(/(?:(?:subscriber|insured)\s*(?:name)?|member\s+name)\s*[:\-]?\s*([A-Z][A-Za-z ,.'-]{3,40})/i)
    || capture(/\bName\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,4})/i)
    // UHC/Sierra format: "Member FIRSTNAME LASTNAME ~ aMember ID" (OCR noise between name and ID)
    || capture(/\bMember\s+([A-Z][A-Za-z ]{3,30}?)(?=\s*(?:~|a?Member\s+ID|\bID\s*\d|\d{6,}|Group|RxBIN))/i)
    || (nameBeforeMemberId ? cleanExtractedValue(nameBeforeMemberId[1]) : '');
  subscriberName = cleanSubscriberName(subscriberName);

  if (!subscriberName) {
    subscriberName = cleanSubscriberName(
      capture(/\bName\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})(?=\s+Member\s+ID\b|\s+(?:Hospital|Specialist|Network|Group|Effective|Front|Back)\b|\s*$)/i),
    );
  }
  if (!subscriberName) {
    const nameLine = lines.find((line) => {
      const w = line.trim();
      if (w.length < 6 || w.length > 45) return false;
      const parts = w.split(/\s+/).filter(Boolean);
      return parts.length >= 2 && parts.length <= 5 && /^[A-Z]/.test(w)
        && !/cigna|anthem|aetna|united|sierra|open access|network|deduct|coinsurance|hospital|specialist|referral|progressive|multiplan|menu|id cards|pharmacy|effective date|member id|group number/i.test(w);
    });
    if (nameLine) subscriberName = cleanSubscriberName(nameLine.trim().replace(/^Name\s+/i, ''));
  }

  // ── Payer name ─────────────────────────────────────────────────────────────
  // Try specific known-payer patterns first (avoids grabbing garbage OCR lines)
  let payerName = '';

  const cignaAdmin = joined.match(/Administered\s+By\s+(Cigna\s+Health\s+and\s+Life\s+Ins\.?\s*Co\.?)/i);
  const cignaShort = joined.match(/\b(Cigna(?:\s+[\w&.]+){0,6}(?:Ins\.?\s*Co\.?|Healthcare|Health\s+and\s+Life))/i);
  const anthemMatch = joined.match(/\b(Anthem(?:\s+Blue\s+Cross(?:\s+(?:and\s+)?Blue\s+Shield)?)?)\b/i);
  const unitedMatch = joined.match(/\b(UnitedHealthcare|United\s+HealthCare|United\s+Health)\b/i);
  const sierraMatch = joined.match(/\b(Sierra\s+Health(?:\s+and\s+Life)?(?:\s+Insurance(?:\s+Company)?)?)\b/i);
  const aetnaMatch  = joined.match(/\b(Aetna(?:\s+[\w.]+){0,3})\b/i);
  const humanaMatch = joined.match(/\b(Humana(?:\s+[\w.]+){0,3})\b/i);
  const bcbsMatch   = joined.match(/\b(Blue\s+Cross(?:\s+and\s+Blue\s+Shield)?(?:\s+of\s+\w+)?)\b/i);
  const medicareMatch = joined.match(/\b(Medicare(?:\s+Advantage)?)\b/i);
  const medicaidMatch = joined.match(/\b(Medicaid)\b/i);

  if (cignaAdmin) {
    payerName = cleanExtractedValue(cignaAdmin[1]);
  } else if (cignaShort) {
    payerName = cleanExtractedValue(cignaShort[1]);
  } else if (/\bcigna\b/i.test(joined)) {
    payerName = 'Cigna';
  } else if (/\bmycigna\.com\b/i.test(joined)) {
    payerName = 'Cigna (myCigna)';
  } else if (anthemMatch) {
    // Normalize to proper case regardless of how OCR read it (e.g. "anthem.com" → "Anthem")
    payerName = cleanExtractedValue(anthemMatch[1]).replace(/\banthem\b/i, 'Anthem');
  } else if (unitedMatch) {
    payerName = cleanExtractedValue(unitedMatch[1]);
  } else if (sierraMatch) {
    payerName = cleanExtractedValue(sierraMatch[1]);
  } else if (aetnaMatch) {
    payerName = cleanExtractedValue(aetnaMatch[1]);
  } else if (humanaMatch) {
    payerName = cleanExtractedValue(humanaMatch[1]);
  } else if (bcbsMatch) {
    payerName = cleanExtractedValue(bcbsMatch[1]);
  } else if (medicareMatch) {
    payerName = cleanExtractedValue(medicareMatch[1]);
  } else if (medicaidMatch) {
    payerName = 'Medicaid';
  }

  // Last resort: short clean line that looks like a company name
  if (!payerName) {
    payerName = lines.find((line) =>
      /^[A-Z][A-Za-z&.\- ]{4,50}$/.test(line)
      && !/member|subscriber|group|effective|claims|customer service|rx|referral|preventive|hospital|network|copay|deductible/i.test(line)
    ) || '';
  }

  // ── Other fields ───────────────────────────────────────────────────────────
  const phone = capture(/(?:provider|customer service|claims|benefits)?\s*(?:phone|call)?\s*[:\-]?\s*(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})/i);

  const effectiveDate =
    capture(/(?:coverage\s*)?effective\s*date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    || capture(/effective\s*date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  const planName =
    capture(/\b(open\s+access\s+plus|pathwell|ppo|hmo|epo|hdhp)\b/i)
    || capture(/plan\s*(?:type)?[:\s]+([^\n]+)/i);

  const deductibleInn = capture(/(?:INN|in[\s-]*network)[^\d$]*\$?\s*([\d,]+)/i)
    || capture(/deductible[^.\n]*INN[^.\n]*\$?\s*([\d,]+)/i);

  const coinsuranceSpecialist = capture(/specialist[:\s]+(\d{1,3})\s*%/i);
  const coinsuranceInn = capture(/in[\s-]*network[:\s]+(\d{1,3})\s*%/i);

  const payerId = capture(/payer\s*id[:\s#]*([A-Z0-9#]+)/i);

  return {
    payer_name: payerName,
    member_id: memberId,
    group_number: groupNumber,
    subscriber_name: subscriberName,
    support_phone: phone,
    effective_date: effectiveDate,
    plan_name: planName,
    payer_id: payerId,
    deductible_inn: deductibleInn,
    coinsurance_specialist_pct: coinsuranceSpecialist,
    coinsurance_inn_pct: coinsuranceInn,
    extracted_text: joined,
    confidence: [payerName, memberId].filter(Boolean).length >= 2 ? 'medium' : 'low',
  };
}
