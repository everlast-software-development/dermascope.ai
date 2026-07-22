// ─────────────────────────────────────────────────────────────
// All static content for the DermaScope.ai landing page lives here
// so the presentational components stay lean.
// ─────────────────────────────────────────────────────────────

export const heroStats = [
  { value: '300+', label: 'Skin conditions supported' },
  { value: '95%', label: 'Image analysis accuracy, up to' },
  { value: '3', label: 'Standardized imaging angles' },
]

// The Clinical Reality — accordion of pain points
export const painPoints = [
  {
    title: 'Visually Complex Skin Conditions',
    image: '/The%20Clinical%20Reality.webp',
    body: 'Many skin conditions share similar visual characteristics, making accurate assessment and clinical decision-making more difficult.',
    tagsLabel: 'Examples',
    tags: [
      'Pigmented lesions',
      'Inflammatory skin diseases',
      'Wounds & ulcers',
      'Scars',
      'Hair & scalp disorders',
      'Nail abnormalities',
    ],
  },
  {
    title: 'Early Changes Are Easy to Miss',
    image: '/Early%20Changes.webp',
    body: 'Subtle differences in color, borders, texture, or healing may indicate disease progression or treatment response, yet they can be difficult to detect consistently.',
    tagsLabel: 'Challenges',
    tags: [
      'Lesion evolution',
      'Pigmentation changes',
      'Scar remodeling',
      'Wound healing',
      'Treatment outcomes',
    ],
  },
  {
    title: 'Clinical Decisions Require More Than Images',
    image: '/Clinical%20Decisions.webp',
    body: 'Effective skin assessment often depends on combining clinical history, visual findings, previous records, and professional expertise—not image interpretation alone.',
    tagsLabel: 'Clinical Inputs',
    tags: [
      'Patient history',
      'Clinical observations',
      'Previous treatments',
      'Risk factors',
      'Follow-up records',
    ],
  },
  {
    title: 'Documentation Is Time-Consuming',
    image: '/Documentation.webp',
    body: 'Clinical documentation must be accurate, structured, and consistent to support patient care, communication, research, and regulatory requirements.',
    tagsLabel: 'Documentation',
    tags: [
      'Consultation notes',
      'Clinical reports',
      'Procedure records',
      'ICD / CPT Coding support',
      'Follow-up summaries',
    ],
  },
  {
    title: 'Tracking Progress Is Often Subjective',
    image: '/Tracking%20Progress.webp',
    body: 'Without standardized imaging and objective comparison, monitoring healing, disease progression, and treatment response can vary between clinicians and visits.',
    tagsLabel: 'Monitoring',
    tags: [
      'Before & after comparison',
      'Disease progression',
      'Scar healing',
      'Wound recovery',
      'Treatment response',
    ],
  },
  {
    title: 'Clinical Data Is Often Fragmented',
    image: '/Clinical%20Data.webp',
    body: 'Images, clinical notes, follow-up records, and patient information are frequently stored across multiple systems, making collaboration and continuity of care more difficult.',
    tagsLabel: 'Fragmented Data',
    tags: [
      'Clinical images',
      'Patient history',
      'Documentation',
      'Follow-up records',
      'Research data',
    ],
  },
  {
    title: 'AI Is Advancing Rapidly—But Clinical Trust Matters',
    image: '/AI%20Is%20Advancing.webp',
    body: 'Healthcare professionals need AI that is transparent, explainable, and designed to support clinical decision-making—not replace professional expertise.',
    tagsLabel: 'What Clinicians Need',
    highlightTags: true,
    tags: [
      'Explainable AI',
      'Reliable outputs',
      'Human oversight',
      'Standardized workflows',
      'Clinical validation',
    ],
  },
]

// Why DermaScope — feature 01: multi-angle imaging tabs
export const angles = [
  {
    tab: '90° Frontal',
    heading: '90° — Frontal View',
    caption: 'Provides a direct view of the lesion for accurate assessment of:',
    points: ['Lesion size', 'Color distribution', 'Surface characteristics', 'Anatomical localization'],
    placeholder: '[ 90° frontal capture ]',
  },
  {
    tab: '75° Oblique',
    heading: '75° — Oblique View',
    caption: 'Reveals structural details that may not be visible from the frontal image.',
    points: ['Border definition', 'Elevation', 'Surface irregularities', 'Pigmentation depth'],
    placeholder: '[ 75° oblique capture ]',
  },
  {
    tab: '40° Side',
    heading: '40° — Side View',
    caption:
      'Captures depth and three-dimensional characteristics that are essential for monitoring disease progression and treatment response.',
    points: ['Lesion thickness', 'Scar elevation', 'Wound depth', 'Healing progression'],
    placeholder: '[ 40° side capture ]',
  },
]

export const angleWhy = [
  'Reduces visual blind spots',
  'Improves image consistency',
  'Supports more comprehensive AI analysis',
  'Enables more accurate before-and-after comparisons',
]

export const aiFeatures = [
  'Lesion morphology',
  'Pigmentation patterns',
  'Borders and symmetry',
  'Texture',
  'Vascular changes',
  'Wound characteristics',
  'Scar evolution',
  'Hair and nail findings',
]

export const confidenceTags = ['Explainable', 'Transparent', 'Reviewable', 'Physician-controlled']

export const workflowOutputs = [
  'Clinical reports',
  'SOAP notes',
  'ICD / CPT Coding support',
  'Patient summaries',
  'Follow-up documentation',
]

export const monitoringTags = [
  'Disease progression',
  'Treatment response',
  'Wound healing',
  'Scar remodeling',
  'Before & after outcomes',
]

export const whyChoose = [
  'Supports assessment across 300+ skin conditions',
  'Multi-angle imaging (90° • 75° • 40°)',
  'Up to 95% AI image analysis accuracy on supported workflows',
  'Explainable AI with physician oversight',
  'Standardized documentation and reporting',
  'Objective before-and-after monitoring',
]

// How It Works — autoplaying steps (four-step DermaScope workflow)
export const steps = [
  {
    title: '01. Capture',
    body: 'Upload 3 standardized images (90°, 75°, and 40°) using a smartphone, dermatoscope, or clinical camera.',
    media: { type: 'image', src: '/Capture.webp', alt: 'Capturing standardized skin images from multiple angles' },
  },
  {
    title: '02. AI Analysis',
    body: 'AI analyzes the images, detects visual patterns, and supports the assessment of 300+ skin conditions.',
    media: { type: 'image', src: '/AI%20Analysis.webp', alt: 'AI analyzing images and detecting visual patterns' },
  },
  {
    title: '03. Generate Reports',
    body: 'Create structured clinical reports, SOAP notes, patient summaries, and ICD / CPT Coding support in seconds.',
    media: { type: 'image', src: '/Generate%20Reports.webp', alt: 'Generating structured clinical reports' },
  },
  {
    title: '04. Monitor Progress',
    body: 'Compare visits, track treatment response, and monitor disease progression with before-and-after analysis.',
    media: { type: 'image', src: '/Monitor%20Progress.webp', alt: 'Monitoring patient progress and treatment response over time' },
  },
]

// Who It's For — persona tabs
export const personas = [
  {
    tab: 'Dermatologists',
    heading: 'Dermatologists',
    challenges: [
      'Diagnosing visually similar skin diseases',
      'Identifying subtle red flags early',
      'Managing complex differential diagnoses',
      'Monitoring chronic skin conditions over time',
      'Spending excessive time on documentation',
    ],
    // Ordered to pair 1:1 with `challenges` above (challenge[i] → helps[i]).
    helps: [
      'AI-assisted skin image analysis',
      'Red-flag detection',
      'Differential diagnosis support',
      'Longitudinal treatment monitoring',
      'Automated clinical documentation',
    ],
  },
  {
    tab: 'General Practitioners (GPs)',
    heading: 'General Practitioners (GPs)',
    challenges: [
      'Limited dermatology experience',
      'Difficulty identifying suspicious lesions',
      'Deciding when specialist referral is needed',
      'Limited consultation time',
      'Inconsistent skin documentation',
    ],
    helps: [
      'AI-assisted skin assessment',
      'Red-flag recognition',
      'Referral decision support',
      'Structured clinical reports',
      'Standardized image documentation',
    ],
  },
  {
    tab: 'Plastic & Aesthetic Surgeons',
    heading: 'Plastic & Aesthetic Surgeons',
    challenges: [
      'Monitoring wound healing',
      'Tracking scar evolution',
      'Evaluating treatment outcomes',
      'Managing before-and-after documentation',
      'Communicating results with patients',
    ],
    helps: [
      'Healing progression tracking',
      'Wound & scar analysis',
      'Objective outcome documentation',
      'Before & after comparison',
      'Visual treatment reports',
    ],
  },
  {
    tab: 'Academic Institutions',
    heading: 'Academic Institutions',
    challenges: [
      'Collecting standardized datasets',
      'Annotating clinical images',
      'Building AI-ready databases',
      'Tracking longitudinal outcomes',
      'Ensuring data consistency across studies',
    ],
    helps: [
      'Standardized clinical imaging',
      'AI feature extraction',
      'Structured research-ready datasets',
      'Longitudinal patient data',
      'Explainable AI outputs',
    ],
  },
  {
    tab: 'Clinics & Hospital Networks',
    heading: 'Clinics & Hospital Networks',
    challenges: [
      'Inconsistent documentation',
      'Fragmented patient records',
      'Variable imaging quality',
      'Workflow inefficiencies',
      'Scaling standardized care across teams',
    ],
    helps: [
      'Standardized documentation',
      'Enterprise-ready integration',
      'AI-assisted quality support',
      'Unified clinical workflow',
      'Better collaboration across teams',
    ],
  },
  {
    tab: 'Clinic Administrators',
    heading: 'Clinic Administrators',
    challenges: [
      'Maintaining consistent clinical workflows',
      'Monitoring documentation quality',
      'Improving operational efficiency',
      'Supporting staff productivity',
      'Delivering a better patient experience',
    ],
    helps: [
      'Streamlined clinical workflows',
      'Standardized documentation',
      'Improved operational efficiency',
      'Faster reporting',
      'Better patient communication',
    ],
  },
]

export const roleOptions = [
  'Dermatologist',
  'General Practitioner (GP)',
  'Plastic & Aesthetic Surgeon',
  'Resident',
  'Researcher / Academic',
  'Clinic / Hospital Network',
  'Clinic Administrator',
  'Other',
]

// ── Early Access form option sets ──────────────────────────────
// Main challenges to solve — rendered as multi-select pills.
export const challengeOptions = [
  'Diagnosis Support',
  'Documentation',
  'Coding',
  'Insurance Reports',
  'Patient Education',
  'Follow-up Monitoring',
  'AI Skin Analysis',
  'Enterprise Integration',
]

export const navLinks = [
  { href: '#challenge', label: 'The Challenge' },
  { href: '#why', label: 'Why DermaScope' },
  { href: '#how', label: 'How It Works' },
  // { href: '#battle', label: 'Live Battle' }, // temporarily hidden with the section
  { href: "#who", label: "Who It's For" },
]

// Live Battle with AI — interactive diagnostic quiz (mock cases)
export const dermCases = [
  {
    hint: 'Pigmented lesion · Upper back · M, 54',
    img: '[ case photo — irregular pigmented lesion ]',
    title:
      'A changing 9 mm pigmented lesion with irregular borders and three shades of brown-black.',
    opts: [
      'Seborrheic keratosis',
      'Superficial spreading melanoma',
      'Pigmented basal cell carcinoma',
      'Dermatofibroma',
    ],
    answer: 1,
    why: 'Asymmetry, irregular scalloped borders, color variegation and documented change fulfil the ABCDE criteria — the strongest predictors of melanoma.',
    whyNot:
      'Seborrheic keratosis shows a stuck-on waxy surface; pigmented BCC shows pearly rolled edges with arborizing vessels; dermatofibroma dimples on lateral pressure.',
    refs: [
      'Friedman RJ et al. Early detection of malignant melanoma: the ABCDE criteria. CA Cancer J Clin.',
      "Fitzpatrick's Dermatology, 9th ed. — Melanoma.",
    ],
  },
  {
    hint: 'Pigmented plaque · Temple · F, 67',
    img: '[ case photo — waxy stuck-on brown plaque ]',
    title:
      'A waxy brown plaque that looks stuck on, with tiny keratin-filled pits across the surface.',
    opts: ['Seborrheic keratosis', 'Lentigo maligna', 'Pigmented actinic keratosis', 'Melanocytic nevus'],
    answer: 0,
    why: 'The stuck-on appearance with comedo-like openings and milia-like cysts is classic dermoscopic evidence of seborrheic keratosis.',
    whyNot:
      'Lentigo maligna shows asymmetric follicular pigmentation on sun-damaged skin; actinic keratosis is rough and scaly; a nevus lacks the keratotic surface pits.',
    refs: [
      'Braun RP et al. Dermoscopy of pigmented seborrheic keratoses. J Am Acad Dermatol.',
      'DermNet — Seborrhoeic keratosis.',
    ],
  },
  {
    hint: 'Nodule · Nasal ala · M, 71',
    img: '[ case photo — pearly nodule with fine vessels ]',
    title: 'A pearly nodule with rolled borders and fine branching vessels, slowly enlarging for a year.',
    opts: ['Intradermal nevus', 'Sebaceous hyperplasia', 'Nodular basal cell carcinoma', 'Squamous cell carcinoma'],
    answer: 2,
    why: 'Pearly translucency, rolled borders and arborizing telangiectasia form the hallmark triad of nodular BCC.',
    whyNot:
      'Sebaceous hyperplasia is yellowish and lobulated with a central dell; an intradermal nevus is soft and stable; SCC is typically keratotic, indurated and faster-growing.',
    refs: [
      'Menzies SW et al. Surface microscopy of pigmented basal cell carcinoma. Arch Dermatol.',
      'Bolognia JL et al. Dermatology, 5th ed. — Basal cell carcinoma.',
    ],
  },
  {
    hint: 'Plaques · Extensor elbows · F, 33',
    img: '[ case photo — demarcated plaques with silvery scale ]',
    title:
      'Well-demarcated erythematous plaques with silvery scale on both elbows; pinpoint bleeding when scale is removed.',
    opts: ['Nummular eczema', 'Plaque psoriasis', 'Tinea corporis', 'Pityriasis rosea'],
    answer: 1,
    why: 'Sharp demarcation, silvery micaceous scale on extensor surfaces and the Auspitz sign are defining features of plaque psoriasis.',
    whyNot:
      'Nummular eczema is coin-shaped, weepy and ill-defined; tinea shows an active scaly edge with central clearing; pityriasis rosea follows a herald patch in a fir-tree pattern.',
    refs: [
      'Griffiths CEM, Barker JN. Pathogenesis and clinical features of psoriasis. Lancet.',
      "Fitzpatrick's Dermatology, 9th ed. — Psoriasis.",
    ],
  },
  {
    hint: 'Annular eruption · Dorsal hand · F, 28',
    img: '[ case photo — ring of firm skin-colored papules ]',
    title: 'An expanding ring of firm skin-colored papules on the dorsal hand — no scale, no itch.',
    opts: ['Tinea corporis', 'Nummular eczema', 'Subacute cutaneous lupus', 'Granuloma annulare'],
    answer: 3,
    why: 'A smooth, non-scaly annular border of firm papules is the key differentiator of granuloma annulare — fungal rings scale.',
    whyNot:
      'Tinea corporis has a scaly advancing edge and positive KOH; nummular eczema is crusted and pruritic; subacute lupus favors photodistributed polycyclic scaly plaques.',
    refs: [
      'Piette EW, Rosenbach M. Granuloma annulare: clinical and histologic variants. J Am Acad Dermatol.',
      'DermNet — Granuloma annulare.',
    ],
  },
  {
    hint: 'Vascular-appearing nodule · Shin · M, 61',
    img: '[ case photo — friable red nodule ]',
    title:
      'A rapidly growing, friable red nodule that bleeds at the slightest touch — appeared six weeks ago.',
    opts: ['Pyogenic granuloma', 'Cherry hemangioma', 'Amelanotic melanoma', 'Spitz nevus'],
    answer: 2,
    why: 'In an adult, a new rapidly growing vascular-looking nodule must be treated as amelanotic melanoma until biopsy proves otherwise — the most missed melanoma subtype.',
    whyNot:
      'Pyogenic granuloma typically follows trauma and shows a collarette of scale; cherry hemangiomas are small, stable and multiple; Spitz nevi occur mainly in children.',
    refs: [
      'Koch SE, Lange JR. Amelanotic melanoma: the great masquerader. J Am Acad Dermatol.',
      'NICE Guideline NG12 — Suspected cancer: recognition and referral.',
    ],
  },
  {
    hint: 'Persistent patch · Calf · F, 74',
    img: '[ case photo — fixed scaly red patch ]',
    title:
      'A slowly enlarging, sharply bordered scaly red patch on the calf, unresponsive to steroid creams for months.',
    opts: ['Bowen disease (SCC in situ)', 'Psoriasis', 'Chronic eczema', 'Superficial BCC'],
    answer: 0,
    why: 'A fixed, asymptomatic, sharply bordered scaly plaque that fails steroid therapy on sun-exposed elderly skin is Bowen disease until biopsied.',
    whyNot:
      'Psoriasis and eczema usually respond to steroids and are multifocal or itchy; superficial BCC shows a fine rolled, thread-like edge with a shiny surface.',
    refs: [
      "Morton CA et al. British Association of Dermatologists guidelines for Bowen's disease. Br J Dermatol.",
      'Bolognia JL et al. Dermatology, 5th ed. — SCC in situ.',
    ],
  },
  {
    hint: 'Crateriform nodule · Forearm · M, 68',
    img: '[ case photo — dome nodule with keratin crater ]',
    title: 'A dome-shaped nodule with a central keratin crater that grew to 15 mm in just five weeks.',
    opts: ['Keratoacanthoma', 'Nodular BCC', 'Common wart', 'Cutaneous horn'],
    answer: 0,
    why: 'Explosive growth of a symmetric dome with a central keratin plug is the classic keratoacanthoma story — managed as well-differentiated SCC.',
    whyNot:
      'Nodular BCC grows slowly with pearly edges; warts are verrucous with thrombosed capillaries; a cutaneous horn is a reaction pattern that still needs a base diagnosis.',
    refs: [
      'Savage JA, Maize JC. Keratoacanthoma clinical behavior: a systematic review. Am J Dermatopathol.',
      "Fitzpatrick's Dermatology, 9th ed. — Keratoacanthoma.",
    ],
  },
  {
    hint: 'Papular eruption · Volar wrists · F, 45',
    img: '[ case photo — violaceous flat-topped papules ]',
    title:
      'Intensely itchy, flat-topped violaceous papules on both wrists with fine white lacy lines on top.',
    opts: ['Guttate psoriasis', 'Lichen planus', 'Pityriasis rosea', 'Lichenoid drug eruption'],
    answer: 1,
    why: 'The classic 6 Ps — purple, polygonal, planar, pruritic papules and plaques — plus Wickham striae point to lichen planus.',
    whyNot:
      'Guttate psoriasis is salmon-pink with scale; pityriasis rosea is trunk-centred with collarette scale; a lichenoid drug eruption is more diffuse and needs a drug history.',
    refs: ['Le Cleach L, Chosidow O. Lichen planus. N Engl J Med.', 'DermNet — Lichen planus.'],
  },
  {
    hint: 'Firm papule · Lower leg · F, 39',
    img: '[ case photo — firm brown papule ]',
    title: 'A firm brown papule on the leg that puckers inward when squeezed from the sides.',
    opts: ['Dermatofibroma', 'Melanoma', 'Neurofibroma', 'Pigmented BCC'],
    answer: 0,
    why: 'A positive dimple (Fitzpatrick) sign on a firm, stable, evenly pigmented papule is characteristic of dermatofibroma.',
    whyNot:
      'Melanoma does not dimple and shows change or color variegation; neurofibromas invaginate softly (buttonhole sign); pigmented BCC has pearly translucency and vessels.',
    refs: [
      'Zaballos P et al. Dermoscopy of dermatofibromas. Arch Dermatol.',
      "Fitzpatrick's Dermatology, 9th ed. — Benign neoplasms.",
    ],
  },
]
