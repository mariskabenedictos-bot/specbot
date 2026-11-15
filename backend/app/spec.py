"""Static mission spec: NASA-sourced thresholds, station layout and body regions.

Everything in this module is plain data. It is the single source of truth for
thresholds and station geometry, and is served to the frontend by GET /api/meta.
"""

LANDING = 247          # landing day of the mission
EVA_DAY = 200          # planned spacewalk day
EVA_FLOOR = 32.9       # ml/kg/min, NASA V1 4003 (TB031)

SOURCES = {
    "TB020": [
        "OCHMO-TB-020 Design for Ionizing Radiation Protection, Rev E",
        "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf",
    ],
    "HRPRAD": [
        "Zawaski, Space Radiation: It's Everywhere We Want to Be (NASA HRP)",
        "https://ntrs.nasa.gov/api/citations/20240014923/downloads/EDUCATIONAL%20SRE%20Radiation%20Health%20Effects.pdf",
    ],
    "SPACEFARING": [
        "Space Faring: The Radiation Challenge (NASA educator guide)",
        "https://www.nasa.gov/wp-content/uploads/2017/04/radiationchallenge.pdf",
    ],
    "BONERISK": [
        "Risk of Spaceflight-Induced Bone Changes (NASA HRP)",
        "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/",
    ],
    "MTB013": [
        "OCHMO-MTB-013 Bone Loss, Rev D",
        "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf",
    ],
    "TB031": [
        "OCHMO-TB-031 Exercise Overview",
        "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-031-exercise-overview.pdf",
    ],
    "TB033": [
        "OCHMO-TB-033 Spaceflight Experience and Medical Care, Rev C",
        "https://www.nasa.gov/wp-content/uploads/2023/07/ochmo-tb-033-spaceflight-experience-medical-care-rev-c.pdf",
    ],
    "ORTHO": [
        "HRP Evidence Report: Risk of Orthostatic Intolerance During Re-exposure to Gravity",
        "https://ntrs.nasa.gov/api/citations/20150007319/downloads/20150007319.pdf",
    ],
    "IMMUNE21": [
        "Scientists Probe How Long-Term Spaceflight Alters Immunity (NASA, 2021)",
        "https://www.nasa.gov/missions/station/scientists-probe-how-long-term-spaceflight-alters-immunity/",
    ],
    "ROONEY19": [
        "Rooney et al. 2019, Herpes Virus Reactivation in Astronauts During Spaceflight (NASA JSC)",
        "https://pmc.ncbi.nlm.nih.gov/articles/PMC6374706",
    ],
    "MAKEDONAS19": [
        "Makedonas et al. 2019, Specific Immunologic Countermeasure Protocol (NASA JSC)",
        "https://www.frontiersin.org/articles/10.3389/fimmu.2019.02407/full",
    ],
    "TB004": [
        "OCHMO-TB-004 Carbon Dioxide, Rev D",
        "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf",
    ],
    "SLEEP": [
        "NASA-STD-3001 Technical Brief: Sleep Accommodations, Rev A",
        "https://www.nasa.gov/wp-content/uploads/2023/03/sleep-accomodations-technical-brief-ochmo.pdf",
    ],
    "TB014": [
        "OCHMO-TB-014 Behavioral Health Mishaps, Rev B",
        "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-014-behavioral-health-mishaps.pdf",
    ],
}

# Sample station layout, based on the ISS but not to scale.
MODULES = [
    {"id": "quarters", "name": "Harmony", "sub": "Crew quarters", "x": 40, "y": 220, "w": 110, "h": 60, "lx": 126, "ly": 298},
    {"id": "columbus", "name": "Columbus", "sub": "ESA lab", "x": 70, "y": 112, "w": 50, "h": 108, "v": True, "lx": 128, "ly": 150},
    {"id": "kibo", "name": "Kibo", "sub": "JAXA lab", "x": 70, "y": 280, "w": 50, "h": 124, "v": True, "lx": 128, "ly": 372},
    {"id": "lab", "name": "Destiny", "sub": "US lab", "x": 150, "y": 224, "w": 150, "h": 52, "lx": 236, "ly": 298},
    {"id": "node", "name": "Unity", "sub": "Galley, dock", "x": 300, "y": 220, "w": 80, "h": 60, "lx": 302, "ly": 196},
    {"id": "gym", "name": "Tranquility", "sub": "Exercise: treadmill, ARED", "x": 315, "y": 280, "w": 50, "h": 110, "v": True, "lx": 373, "ly": 318},
    {"id": "zarya", "name": "Zarya", "sub": "Storage", "x": 380, "y": 226, "w": 110, "h": 48, "lx": 396, "ly": 196},
    {"id": "shelter", "name": "Zvezda", "sub": "Storm shelter (sample)", "x": 490, "y": 220, "w": 160, "h": 60, "shielded": True, "lx": 500, "ly": 196},
]

LINKS = [
    ("columbus", "quarters"),
    ("kibo", "quarters"),
    ("quarters", "lab"),
    ("lab", "node"),
    ("node", "gym"),
    ("node", "zarya"),
    ("zarya", "shelter"),
]

# mSv/day, simulated inside NASA's 0.44-0.88 range (SPACEFARING).
BASE_RAD = {
    "quarters": 0.55,
    "columbus": 0.7,
    "kibo": 0.68,
    "lab": 0.7,
    "node": 0.6,
    "gym": 0.65,
    "zarya": 0.62,
    "shelter": 0.25,
}

HAZ_META = {
    "radiation": {
        "title": "Space radiation",
        "sub": "Station sensors measure module radiation. SPECC's dosimeter follows you to give your personal dose.",
    },
    "gravity": {
        "title": "Altered gravity",
        "sub": "Bone loses 1 to 1.5% a month without countermeasures. SPECC tracks your exercise and fitness tests.",
    },
    "immune": {
        "title": "Immune changes",
        "sub": "Sleep, stress, vitamin D and storms add up. SPECC swabs saliva for dormant viruses.",
    },
    "environment": {
        "title": "Closed environment and isolation",
        "sub": "Cabin air, sleep and mood feed the immune prediction.",
    },
}

LEVEL = {"self": "You", "crewmate": "Tell a crewmate", "surgeon": "Flight surgeon"}

# Body map regions, keyed to dashboard tile names.
REGIONS = [
    {"id": "head", "name": "Head and eyes", "x": 230, "y": 44, "side": "R", "ly": 40,
     "tiles": ["Vision and eye (SANS)", "Cabin CO2 where you sleep", "Mood and focus check-in", "Sleep, 7-night average"]},
    {"id": "mouth", "name": "Mouth and saliva", "x": 230, "y": 76, "side": "L", "ly": 80,
     "tiles": ["Virus shedding in saliva", "Immune risk factors"]},
    {"id": "heart", "name": "Heart and circulation", "x": 246, "y": 152, "side": "R", "ly": 150,
     "tiles": ["Fainting risk after landing", "Stand test before landing"]},
    {"id": "blood", "name": "Blood and bone marrow", "x": 212, "y": 196, "side": "L", "ly": 190,
     "tiles": ["Career effective dose", "Blood-forming organ dose, 30 days", "Lymphocytes after a solar storm", "Solar storm alert"]},
    {"id": "skin", "name": "Skin", "x": 154, "y": 236, "side": "L", "ly": 290, "tiles": ["Skin camera check"]},
    {"id": "spine", "name": "Spine and hips", "x": 230, "y": 272, "side": "R", "ly": 280,
     "tiles": ["Hip and spine bone density", "Vitamin D (25-OH)"]},
    {"id": "legs", "name": "Leg muscles and fitness", "x": 208, "y": 420, "side": "L", "ly": 420,
     "tiles": ["Muscle strength", "Aerobic capacity (VO2max)", "Exercise sessions this week"]},
]

# Fallback action plan for any tile that is not OK, using the spec's actions.
PLANS = {
    "Career effective dose": ["Sleep and work in the better-shielded module.", "crewmate", "TB020"],
    "Blood-forming organ dose, 30 days": ["Stay in shielded areas. Contact the flight surgeon at the limit.", "surgeon", "HRPRAD"],
    "Lymphocytes after a solar storm": ["Recheck in a week. Counts toward immune risk until it recovers.", "self", "MAKEDONAS19"],
    "Hip and spine bone density": ["Add a resistance session and check calcium and vitamin D intake.", "self", "MTB013"],
    "Aerobic capacity (VO2max)": ["Add interval sessions.", "self", "TB031"],
    "Muscle strength": ["Add resistance sessions.", "self", "TB031"],
    "Exercise sessions this week": ["Book the missing sessions. Aim for 6 a week.", "self", "MTB013"],
    "Vitamin D (25-OH)": ["Take the vitamin D supplement to reach 35 to 90 ng/ml.", "self", "MTB013"],
    "Sleep, 7-night average": ["Earlier lights-out and a darker, quieter sleep station.", "self", "SLEEP"],
    "Mood and focus check-in": ["Talk to a crewmate. If it lasts, contact the flight surgeon.", "crewmate", "TB014"],
    "Vision and eye (SANS)": ["Eye exam with the flight surgeon. More frequent eye checks.", "surgeon", "TB033"],
    "Skin camera check": ["Send photos to the crew medical officer. Recheck tomorrow.", "crewmate", "ROONEY19"],
    "Stand test before landing": ["Fluid loading and compression garments. Repeat the stand test.", "self", "ORTHO"],
}