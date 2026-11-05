### 1.1 Nature of treatment frequently sought

**Doable now (proxy):** Yes.  
Count the services people actually book and pay for:

- Appointment service name (consultation, follow-up, scan, and so on).
- Provider type (doctor, pharmacy, laboratory, radiology, hospital, clinic).
- Prescription requests (medication).
- Invoice line-item names.

**Not doable as true “disease nature” yet:** A free-text visit note that says “fever, possible malaria” is not a clean category. Those notes are also encrypted, so Admin should not decrypt every ledger to build a dashboard.

**Extra work:** Add a required **treatment / disease category** on the visit or invoice (a short controlled list).  
**Extra input:** Agree the list (for example: Malaria, Diabetes, Hypertension, Maternal, Child health, Mental health, Other). Medical or actuarial input is needed so the list matches what schemes and partners will accept later.

---

### 1.2 Total patients treated monthly and annually

**Doable now:** Yes.

Count unique patients (and beneficiaries) with a completed appointment, a recorded visit, or a paid/authorised invoice in the month and in the year.

**Extra work:** Decide the business rule once, in writing:

- Does “treated” mean appointment completed, visit recorded, invoice paid, or any of these?
- Count unique people, or count encounters (the same person twice in one month)?
- Include beneficiaries as separate treated lives?

**Extra input:** None beyond that rule. No new data capture.

---

### 1.3 Most utilised type of medical services (medication, laboratory, etc.)

**Doable now:** Yes, at **provider-type** level.

The app already labels providers as doctor, pharmacy, laboratory, radiology, hospital, or clinic. Prescriptions vs consultations vs invoices can be counted separately.

**Limitation:** Line items are typed by the provider (“Lab panel”, “ACT”, “Consultation”). They are not a standard catalogue. “Medication” vs “laboratory” is reliable when the **provider category** is used. It is weaker if you only read the line-item name.

**Extra work (to make it sharper):** A small service catalogue on invoices (Consultation / Medication / Laboratory / Imaging / Procedure / Other).  
**Extra input:** Optional catalogue from operations or the provider network.

---

### 1.4 Average cost per provider

**Doable now:** Yes.

Average (and median) invoice amount per provider, per month, per country, and per provider type.

This is one of the strongest live metrics in the current app.

**Extra work:** Wire the existing invoice table to the intelligence screen. Optionally show wallet portion vs amount paid outside the app.  
**Extra input:** None.

---

### 1.5 Preferred providers for specific treatment pathways

**Doable now (weak proxy):** Which providers have the most encounters, the highest ratings, or the most repeat patients.

**Not doable as “pathways” yet:** A pathway means “for malaria, patients prefer Provider A; for diabetes, Provider B.” That needs a disease or pathway code on the visit or invoice. Today that code does not exist.

**Extra work:** Store a pathway or disease category on the encounter; then rank providers inside each category.  
**Extra input:** Define what a “pathway” is (malaria RDT + ACT, diabetes review + HbA1c, antenatal package, and so on). Clinical input required.

---

### 1.6 Disease dashboard visuals (interactive maps by county)

**Doable now:** **Country** view only (Kenya, Zimbabwe, Zambia). Admin already has a country filter. Country Analytics already breaks volume by country.

**Not doable now:** Interactive **county** maps (Nairobi, Kiambu, Mombasa, Harare, Bulawayo, and so on).

Why:

- There is no county field on the patient or the live provider record.
- Address is free text.
- Map pins (`lat` / `lng`) exist on some providers, but not as a complete, quality-checked set.
- The app has no county boundary map files.

**Extra work:**

- Add a required **county / province** pick-list on provider onboarding (city/region is already collected on the application form; it must be saved as a standard code on the provider).
- Optionally collect county on the patient or infer it from the provider they used.
- Build a choropleth map (colour by volume or by disease).

**Extra input:**

- Official county / province lists for Kenya, Zimbabwe, and Zambia.
- Map boundary files (GeoJSON) if the map must be interactive.
- A rule: is “burden” counted at the **patient’s home county** or the **provider’s county**?

This is a later-stage visual until county is a real field.

---

### 1.7 Acute disease burden

**Doable now:** No, not as a clinical statistic.

There is no acute vs chronic flag.

**Possible proxy (not recommended as a published “burden” number):** Guess from keywords in unencrypted invoice notes. This will be wrong often and should not go to schemes or government.

**Extra work:** Add acuity (Acute / Chronic / Other) or derive it from the disease category list.  
**Extra input:** Clinical definition of acute vs chronic for GG’APP (malaria = acute, hypertension = chronic, and so on).

---

### 1.8 Chronic disease burden

Same as 1.7.

**Doable now:** No.  
**Extra work / input:** Same as acute — a category list with chronic tagged on.

---

### 1.9 Mental health cases

**Doable now:** No.

Nothing in the booking or visit flow marks a case as mental health.

**Extra work:** A disease category that includes Mental health, or a specialty flag.  
**Extra input:** What counts (depression, anxiety, psychiatry consult, counselling). Privacy rules: mental health is sensitive; aggregates only, never named patients on an admin map.

---

### 1.10 Maternal health cases

**Doable now:** No as a coded count.

**Weak proxy:** Service names that mention antenatal, midwife, or ultrasound — incomplete and unreliable.

**Extra work:** Maternal / prenatal category on the encounter.  
**Extra input:** Clinical scope (ANC visits, delivery, postnatal, family planning — which of these are “maternal” for this dashboard?).

---

### 1.11 Child health cases

**Partly doable now:** Yes, as an **age proxy**.

If the visit or invoice is for a beneficiary (or the patient) aged under 18, you can count “child encounters” from date of birth. `serviceForAge` already exists on invoices when the service is for a beneficiary.

**Not doable as a clinical child-health programme:** Vaccination, nutrition, under-5 malaria, and so on still need categories.

**Extra work:** Keep the age rule, then add child-health categories if partners need them.  
**Extra input:** Age cut-off (under 5 vs under 18) for “child health” vs “pediatric membership”.

---

### 1.12 Provider utilisation benchmarks — per country / region and per type of service

| Slice | Doable now? |
|---|---|
| Per **country** | **Yes** (Kenya, Zimbabwe, Zambia). |
| Per **type of service** | **Yes** at provider-category level. |
| Per **region / county** | **No** until county/region is a standard field on the live provider (and ideally the patient). |

**Extra work:** Save application `region` / `city` onto the provider as a controlled value; then group utilisation (encounters, spend, unique patients) by that value.  
**Extra input:** The region list per country (counties vs provinces vs districts — pick one geography per market).

---

### 1.13 Most prevalent times when treatment is sought (day / night)

**Doable now:** Yes.

Appointments store a time label and a request timestamp. You can bucket:

- Day (for example 06:00–18:00) vs night (18:00–06:00).
- Finer slots (early morning, peak outpatient, evening, overnight).

**Extra work:** Confirm whether “sought” means **time the patient booked**, **time of the appointment**, or **time the visit was recorded**. Those three can differ.  
**Extra input:** The day/night cut-off you want to publish (06:00–18:00 is a reasonable default).

---

### 1.14 Top disease categories (for example Malaria, Diabetes, Hypertension)

**Doable now:** No, not as a ranked clinical list.

Sample dashboards already show these names. They are illustrations.

**Extra work:** Required category on visit/invoice; then rank by case count and by cost.  
**Extra input:** The official GG’APP top-category list. Without a shared list, every provider will spell the same illness differently.

Privacy: publish **counts**, not patient names. Do not bulk-decrypt visit notes to “find” malaria.

---

### 1.15 Average cost of treatment comparisons by provider

**Doable now:** Yes — overall and by provider type.

**Doable later (richer):** Average cost **for the same condition** at Provider A vs Provider B. That needs the disease/pathway code from 1.5 and 1.14.

**Extra work:** Phase 1 = average invoice by provider. Phase 2 = average invoice by provider **and** category.  
**Extra input:** Same category list as disease burden.

---

### Disease Burden — summary

| Data point | Doable now | Extra work | Extra input |
|---|---|---|---|
| Nature of treatment (service type) | Yes (proxy) | Optional service catalogue | Optional catalogue |
| Patients treated monthly / annually | Yes | Agree the counting rule | Counting rule from operations |
| Most utilised medical services | Yes (by provider type) | Optional invoice catalogue | Optional |
| Average cost per provider | Yes | Wire live totals | None |
| Preferred providers for pathways | Proxy only | Category on the encounter | Pathway definitions |
| Interactive county maps | Country only | County field + map | County lists + map files |
| Acute burden | No | Acuity or category tags | Clinical definitions |
| Chronic burden | No | Same | Same |
| Mental health cases | No | Category + privacy rules | What counts as mental health |
| Maternal health cases | No | Category | Clinical scope |
| Child health cases | Age proxy yes | Child-health categories | Age cut-off |
| Utilisation by country / service type | Yes | — | — |
| Utilisation by region | No | Save region/county | Geography list per country |
| Day vs night seeking | Yes | Confirm which timestamp | Day/night hours |
| Top disease categories | No | Required disease list | Agreed category list |
| Cost comparison by provider (overall) | Yes | Wire live totals | None |
| Cost comparison by provider **and** disease | No | Category + report | Category list |

---

# 2. Membership Demographics

This group is about **who is on the platform** (applicants vs beneficiaries, age, gender) and **which ages carry which diseases**.

This is the closest group to “ready,” except gender and disease-by-age.

---

### 2.1 Age profiling of applicants (five age bands)

**Doable now:** Yes.

Every patient profile stores date of birth. Age can be calculated and grouped. Suggested bands matching `admin.md`:

1. Below 18  
2. 19–24  
3. 25–34  
4. 35–50  
5. 51+

(The example “9–24, 25–30…” in the source note can be replaced by these five bands, or by any five bands you freeze.)

**Extra work:** Implement the band table on the Demographics screen from live dates of birth.  
**Extra input:** Lock the five band edges so insurers and internal reports never disagree. The source note is slightly inconsistent (`<18` and `>19`, and an example starting at 9–24). **Someone must confirm the five bands in writing.**

---

### 2.2 Age profiling of beneficiaries (same five bands)

**Doable now:** Yes.

Beneficiaries already have date of birth. Same bands as applicants. You can also show applicant-to-beneficiary ratio and “total covered lives.”

**Extra work:** Same query as 2.1, second population.  
**Extra input:** Same locked band list. Confirm whether a child principal applicant (rare) is counted as applicant, not beneficiary.

---

### 2.3 Registered customers’ gender profile (Male / Female)

**Not doable now.** This is a capture bug, not a reporting problem.

The registration form **asks** for gender. The server **does not save it**. There is no gender column on the patient profile. Beneficiaries have no gender field. The provider workspace currently shows gender as “Not specified.”

**Extra work:**

- Add gender to the patient profile and save it at registration.
- Optionally add gender when adding a beneficiary.
- Backfill is **not** possible for existing users unless you ask them again.

**Extra input:**

- Allowed values (Male / Female / Prefer not to say / Other).
- Whether beneficiaries must have gender (needed if you want a full covered-life gender split).
- Consent / privacy wording if gender will later be used for marketing or risk analysis.

Until this is saved, any gender pie chart on Admin is fiction.

---

### 2.4 Disease prevalence by age

**Doable now:** No as a clinical cross-tab.

**Doable as soon as both exist:** Age bands (already possible) **plus** disease category (not yet captured). Then: “Hypertension is most common in Band 5; malaria in Band 1,” and so on.

**Extra work:** Disease category on the encounter (same as Section 1). Then join to patient or beneficiary age at the date of service.  
**Extra input:** Same category list as Disease Burden. Rule: use age at **time of treatment**, not current age.

---

### Membership Demographics — summary

| Data point | Doable now | Extra work | Extra input |
|---|---|---|---|
| Applicant age bands | Yes | Live query + chart | Freeze the five bands |
| Beneficiary age bands | Yes | Live query + chart | Same bands |
| Gender profile | No | Persist gender; ask existing users if needed | Gender options + beneficiary rule |
| Disease prevalence by age | No | Disease category + join to age | Category list; age-at-event rule |

---

# 3. Financial Highlights

This group mixes **money the platform already sees** with **inflation science** and **AI**, which the platform does not do yet.

Do not treat the current Financials screen’s “medical inflation 7.8% vs CPI 4.5%” as a measured index. Those are sample figures.

---

### 3.1 Revenue and expense dashboards

**Doable now (revenue side, operational):** Yes.

You can show:

- Gross healthcare volume (sum of invoices).
- Volume by country and by month (Country Analytics already does a version of this).
- Amount taken from the GG’APP credit/wallet vs amount the patient still pays the provider off-app.
- Credit drawn vs credit limit at member level.

**Not doable now (true P&L):**

- Platform **commission / take-rate** is not stored as a ledger of GG’APP income.
- **Operating expenses** (staff, hosting, partner fees, claims handling) are not in the app.
- Provider **payout settlement** as a finance system (what was actually paid out vs invoiced) is not a full accounts package.

So: a **volume dashboard** is Phase 1. An **expense / profit dashboard** is extra work plus finance input.

**Extra work:** Define and store commission; optionally import or enter expenses.  
**Extra input from finance:** What “revenue” means for GG’APP (commission, interest, ad sales, admin fees on credit). What belongs in “expense.”

---

### 3.2 Other revenue (for example advertising of the app)

**Not doable now as real money.**

Admin can create ad banners (image, link, countries, dates). That lives in the **browser**, not in the database. Impression and click counters are not a billing system. There is no advertiser invoice, no rate card, no recognised advertising revenue.

**Extra work:**

- Save campaigns on the server.
- Record impressions and clicks centrally.
- Store advertiser, rate, and amount billed.

**Extra input from commercial / sales:**

- Who pays (pharma, providers, insurers)?
- Pricing (per month, per click, per country)?
- What may be advertised (compliance)?

Until that exists, “App advertising revenue $88,800” on the mock screen should not be presented as actual income.

---

### 3.3 Predictive analytics (AI)

**Doable now:** No.

There is no forecasting model. The sample “AI predictive annualised run-rate” is a made-up projection.

What you *can* do without AI, and should do first:

- Simple trend: last 12 months of invoice volume, extended as a straight-line or seasonal forecast.
- Credit demand by band and country.

That is statistics, not “AI.”

**Extra work (later):** Models for utilisation, credit default, or disease seasonality. Needs clean history (months of real data) and labelled outcomes.  
**Extra input:** What to predict (volume, cost, default, outbreaks), who the audience is (internal vs schemes), and whether partners will accept a model they cannot audit.

Treat this as a **later stage**, after Phase 1 live totals exist.

---

### 3.4 Financial trends — annual credit threshold ranges applied for

**Doable now:** Yes.

Credit applications already store requested amount and approved amount. You can band them, for example:

- 50–250  
- 251–600  
- 601–1,200  
- 1,201+

…or bands in local currency per country.

You can also show: number of applications, approval rate, and average requested vs approved, by year and by country.

**Extra work:** Wire to the Financials screen; pick currency handling (KES vs ZWG vs ZMW vs a USD view).  
**Extra input:** The official band edges (the mock bands are examples). Finance partner input if they already use different tiers.

---

### 3.5 Applicants by region / country

| Slice | Doable now? |
|---|---|
| Credit / member applicants by **country** | **Yes** (country of account or residence). |
| Applicants by **region / county** | **No** — same geography gap as Disease Burden. |

Residence can be in an operating market or abroad. That is already stored and is useful (diaspora vs in-country).

**Extra work:** County/region on the member or on the application.  
**Extra input:** Same geography list as Section 1. Confirm whether “applicant” means credit applicant, registered patient, or both.

---

### 3.6 Most preferred loan repayment options by customers

**Not doable now.**

The credit form does **not** ask how the customer will repay (M-Pesa, card, bank transfer, other).

What exists nearby, and must not be confused with this metric:

- **Provider payout method** (how GG’APP would pay the clinic) — not the patient’s loan repayment.
- **Wallet vs off-app split on an invoice** — how an invoice was settled, not how a loan is repaid over time.
- Sample charts that say “68% M-Pesa” — illustration only.

**Extra work:** Add a repayment-method question on credit apply (and keep it on the application record). Later, if repayments are collected in-app, count **actual** repayments, not only stated preference.  
**Extra input from the finance partner:** Allowed methods per country; whether GG’APP will collect repayments or only originate the loan.

---

### 3.7 Medical inflation dashboard

`admin.md` asks to track utilisation, technology, pharmaceuticals, provider tariffs, and disease complexity vs headline inflation (Kenya ~4–5% CPI, with healthcare often higher).

**Doable now as a true inflation index:** No.

**Doable now as a crude proxy (label it honestly):** Year-on-year change in **average invoice amount** on GG’APP, by country and by provider type. That is “our basket got more expensive,” not “Kenya medical CPI.”
