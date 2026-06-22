export type Subcategory = {
  id: string;
  name: string;
  description: string;
  tips: string[];
  isUrgent?: boolean;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  isEmergency?: boolean;
  subcategories: Subcategory[];
};

export const CATEGORIES: Category[] = [
  {
    id: "emergency",
    name: "Emergency",
    icon: "🚨",
    isEmergency: true,
    subcategories: [
      {
        id: "fire-smoke",
        name: "Fire or Smoke",
        description: "Active fire or smoke in the property",
        isUrgent: true,
        tips: [
          "EVACUATE THE PROPERTY IMMEDIATELY",
          "Call emergency services (999) once you are safely outside",
          "Do NOT attempt to put out the fire yourself",
          "Once safe, contact the property manager immediately",
          "Do not re-enter the property until emergency services declare it safe",
        ],
      },
      {
        id: "gas-leak",
        name: "Gas Leak",
        description: "Smell of gas or suspected gas leak",
        isUrgent: true,
        tips: [
          "LEAVE THE PREMISES IMMEDIATELY — do not use electrical switches or open flames",
          "Do NOT turn any lights on or off",
          "Once outside, call the National Grid Gas Emergency Service: 0800 111 999",
          "Open windows and doors if safe to do so before leaving",
          "Contact the property manager after calling emergency services",
        ],
      },
      {
        id: "major-water-leak",
        name: "Major Water Leak / Flooding",
        description: "Burst pipe or significant flooding",
        isUrgent: true,
        tips: [
          "If safe to do so, turn off the main water supply immediately (stopcock — usually under the sink or in a cupboard)",
          "Turn off electricity at the mains if water is near electrical outlets or appliances",
          "Move valuables and electronics away from the water",
          "Use towels, buckets, or mops to contain the water if possible",
          "Contact the property manager immediately — this is an emergency",
          "Take photos of the damage for insurance purposes if safe to do so",
        ],
      },
      {
        id: "no-heat-extreme-cold",
        name: "No Heat in Extreme Cold",
        description: "Complete heating failure in dangerous cold weather",
        isUrgent: true,
        tips: [
          "Check the thermostat settings and try resetting the boiler",
          "Check for tripped circuit breakers in the fuse box",
          "Use safe portable heaters if available, but never leave them unattended",
          "Contact the property manager immediately — heating failure in extreme cold is an emergency",
          "Keep internal doors closed to conserve heat in occupied rooms",
          "Let taps drip slightly to prevent pipes from freezing",
        ],
      },
      {
        id: "break-in",
        name: "Break-in or Forced Entry",
        description: "Property has been broken into or door/window forced",
        isUrgent: true,
        tips: [
          "If anyone is hurt or you think the intruder may still be inside, leave the property and call 999 first",
          "Once safe, report it to the police on 101 and get a crime reference number — we will need it",
          "Take clear photos of damaged doors, windows or locks before anything is touched or boarded up",
        ],
      },
      {
        id: "power-loss-vulnerable",
        name: "Total Power Loss — Vulnerable Occupant",
        description: "No power and someone in the property is elderly, disabled, has a baby, or needs medical equipment",
        isUrgent: true,
        tips: [
          "Check whether neighbours also have no power — if so it is a network issue: call 105 (free, 24/7)",
          "If power is only off in your property, check the main switch in the consumer unit / fuse box is still up",
          "Do NOT use candles for lighting — use phone torches instead",
          "Keep fridge and freezer doors closed to preserve food",
        ],
      },
    ],
  },
  {
    id: "heating-cooling",
    name: "Heating and Cooling",
    icon: "🌡️",
    subcategories: [
      {
        id: "single-radiator",
        name: "Single Radiator Not Working",
        description: "One radiator or room heater not functioning",
        tips: [
          "Ensure the radiator valve is fully open (turn the control knob counterclockwise)",
          "Check if the radiator is cold at the top but warm at the bottom — this indicates trapped air. You can bleed the radiator using a radiator key",
          "If the radiator has a thermostatic valve (TRV), make sure it is not set to off or a very low setting",
          "If the radiator is warm at the top but cold at the bottom, it may have sludge buildup — this requires professional attention",
        ],
      },
      {
        id: "no-heat-entire",
        name: "No Heat — Entire Property",
        description: "Complete heating system failure",
        tips: [
          "Verify the thermostat is set to Heat mode and the temperature is set higher than the current room temperature",
          "Check that the boiler power switch is turned on (usually on the wall near the boiler)",
          "Check if the circuit breaker for the heating system has tripped and reset it if needed",
          "For gas systems, ensure the gas supply valve is open — do NOT attempt to relight the pilot light yourself",
          "Replace the thermostat batteries if the display is blank",
        ],
      },
      {
        id: "ac-not-cooling",
        name: "Air Conditioning Not Cooling",
        description: "AC system not producing cold air",
        tips: [
          "Confirm the thermostat is set to Cool mode and the temperature is below the current room temperature",
          "Replace the thermostat batteries if the display is blank",
          "Check the circuit breaker for the AC system and reset if tripped",
          "Inspect and replace the air filter if it is dirty or clogged",
          "Check for ice buildup on the indoor or outdoor unit — if frozen, turn off the AC and let it thaw for several hours",
          "Ensure all vents are open and unobstructed by furniture",
        ],
      },
      {
        id: "thermostat-issues",
        name: "Thermostat Issues",
        description: "Thermostat not responding or controlling temperature",
        tips: [
          "If the thermostat display is blank, replace the batteries",
          "Ensure the thermostat is set to the correct mode (Heat or Cool) and the right temperature",
          "Check if the heating system circuit breaker has tripped and reset if needed",
          "Wait 5 minutes after changing settings — some thermostats have a built-in delay",
        ],
      },
    ],
  },
  {
    id: "plumbing-water",
    name: "Plumbing and Water",
    icon: "🚿",
    subcategories: [
      {
        id: "no-hot-water",
        name: "No Hot Water",
        description: "Complete absence of hot water",
        tips: [
          "For electric water heaters: check if the circuit breaker has tripped and reset it. Look for a red reset button on the water heater unit",
          "For gas water heaters: check if the pilot light is lit — do NOT attempt to relight it yourself, request maintenance instead",
          "If hot water was recently used heavily, wait 15–30 minutes for the tank to reheat and test again",
          "Check the temperature setting on the water heater — it should be around 60°C",
        ],
      },
      {
        id: "no-water-low-pressure",
        name: "No Water / Low Pressure",
        description: "No water flow or significantly reduced pressure",
        tips: [
          "Check with neighbours to see if there is an area-wide outage — you can also check your water provider's website",
          "Locate the main water shut-off valve and ensure it is fully open",
          "For a single tap or shower: unscrew the aerator or showerhead and clean out limescale — soak in vinegar for an hour",
          "Check under-sink shut-off valves to ensure they are fully open (turn counterclockwise)",
        ],
      },
      {
        id: "water-leak",
        name: "Water Leak",
        description: "Dripping or leaking pipes, fixtures, or appliances",
        tips: [
          "For under-sink or fixture leaks: turn off the local shut-off valve for that fixture (turn clockwise)",
          "Place a bucket or towel to catch dripping water and prevent floor damage",
          "For appliance leaks (washing machine, dishwasher): turn off the water supply valve to the appliance",
          "For ceiling leaks: use containers to catch water and move valuables away from the area",
          "If the leak is near electrical fixtures, do not use those fixtures and turn off the power if safe to do so",
          "For major leaks that cannot be contained, shut off the main water valve immediately",
        ],
      },
      {
        id: "clogged-drain",
        name: "Clogged Drain",
        description: "Slow or blocked drains in sinks, showers, or toilets",
        tips: [
          "Remove any visible hair or debris from the drain cover or stopper",
          "Try using a plunger — create a tight seal over the drain and pump vigorously",
          "Pour boiling water down the drain to help dissolve grease buildup",
          "Try a mixture of baking soda and vinegar: pour half a cup of baking soda followed by a cup of vinegar, wait 30 minutes, then flush with hot water",
          "Avoid using chemical drain cleaners excessively as they can damage pipes",
        ],
      },
      {
        id: "toilet-issues",
        name: "Toilet Issues",
        description: "Running, clogged, or non-flushing toilet",
        tips: [
          "For a clogged toilet: use a plunger to create suction and dislodge the blockage",
          "For a running toilet: lift the cistern lid and check if the flapper valve is sealing properly",
          "Ensure the float ball or cup is not stuck — it should move freely up and down",
          "If the toilet will not flush, check that the water supply valve behind or below the toilet is fully open",
          "Check the water level in the cistern — it should be about 2.5cm below the overflow tube",
        ],
      },
    ],
  },
  {
    id: "electrical",
    name: "Electrical",
    icon: "⚡",
    subcategories: [
      {
        id: "power-outage",
        name: "Power Outage",
        description: "Complete or partial loss of electrical power",
        tips: [
          "Check if neighbours have power to determine if it is an area-wide outage — or call 105 (free, 24/7)",
          "Locate the fuse box and look for any tripped switches (they will be in the middle or down position)",
          "To reset a tripped breaker: switch it fully OFF, then back ON",
          "If you are on a prepayment meter, check that it has sufficient credit",
          "If the breaker trips again immediately after resetting, unplug all appliances on that circuit before trying again",
        ],
      },
      {
        id: "outlet-light-not-working",
        name: "Outlet or Light Not Working",
        description: "Specific outlets or fixtures not functioning",
        tips: [
          "Test the socket with a known-working device to confirm the socket is the problem",
          "Look for and press the Reset button on any RCD sockets (common in kitchens and bathrooms)",
          "Check the fuse box for tripped switches and reset if needed",
          "For ceiling lights: replace the bulb first — it is often just a blown bulb",
          "Check if a nearby wall switch might control the socket",
          "Do NOT use sockets that are loose, sparking, blackened, or making buzzing noises — report immediately",
        ],
      },
      {
        id: "circuit-breaker-tripping",
        name: "Circuit Breaker Tripping",
        description: "Breaker repeatedly trips when using appliances",
        tips: [
          "Identify which devices are plugged in when the breaker trips",
          "Avoid using multiple high-wattage devices at the same time on the same circuit (e.g. heater, microwave, hair dryer)",
          "After a trip: turn off or unplug all devices on that circuit, then reset the breaker by switching it fully OFF then ON",
          "If the breaker trips immediately even with nothing plugged in, there may be a short circuit — leave it off and report it",
          "Do not repeatedly reset a breaker that keeps tripping instantly — this is a safety hazard",
        ],
      },
      {
        id: "smoke-alarm",
        name: "Smoke Alarm Issues",
        description: "Chirping, false alarms, or non-functioning smoke detectors",
        tips: [
          "For a chirping alarm: replace the battery with a new one (usually a 9-volt battery)",
          "After replacing the battery, press the test button to verify it is working",
          "For hardwired alarms that chirp: replace the backup battery and try resetting by pressing and holding the test button",
          "Clean the alarm by gently vacuuming or blowing out dust — dust buildup can cause false alarms",
          "Never disable or remove smoke detectors — it is illegal and dangerous",
          "If the alarm sounds continuously with no visible fire or smoke, evacuate the property and call 999",
        ],
      },
    ],
  },
  {
    id: "appliances",
    name: "Appliances",
    icon: "🏠",
    subcategories: [
      {
        id: "fridge-not-cooling",
        name: "Refrigerator Not Cooling",
        description: "Fridge not maintaining proper temperature",
        tips: [
          "Check that the fridge is plugged in and the socket has power",
          "Verify the temperature dial is set correctly — not turned to off or the warmest setting",
          "Ensure the door seals properly: close the door on a piece of paper — if it slides out easily, the seal may need replacing",
          "Do not overfill the fridge — air needs to circulate to cool properly",
          "Check for excessive frost buildup in the freezer compartment — if heavily frosted, it may need manual defrosting",
        ],
      },
      {
        id: "oven-stove",
        name: "Oven / Stove Not Working",
        description: "Range or oven not heating properly",
        tips: [
          "For electric ovens: check if the circuit breaker has tripped and reset if needed",
          "Ensure the oven is set to the correct function (e.g. Bake, Grill) and temperature",
          "For gas hobs: listen for the clicking sound of the igniter — if it clicks but does not light, ensure the gas supply is on",
          "Clean any food spills around gas burners — debris can block the igniter",
          "Do NOT attempt to light gas burners with a match or lighter",
        ],
      },
      {
        id: "dishwasher",
        name: "Dishwasher Issues",
        description: "Dishwasher not cleaning, draining, or starting",
        tips: [
          "Check that the dishwasher is plugged in and the circuit breaker has not tripped",
          "Ensure the water supply valve under the sink is fully open",
          "Clean the filter at the bottom of the dishwasher — a clogged filter prevents proper cleaning and draining",
          "Make sure dishes are not blocking the spray arms from rotating",
          "Check that the door latch is closing securely — the dishwasher will not start if the door is not fully closed",
          "If not draining, check the drain hose under the sink for kinks or blockages",
        ],
      },
      {
        id: "washing-machine",
        name: "Washing Machine Problems",
        description: "Washer not filling, draining, or spinning",
        tips: [
          "Ensure the washing machine is plugged in and the circuit breaker has not tripped",
          "Check that both hot and cold water supply valves are fully open",
          "For front-loaders: ensure the door is fully closed and latched",
          "If not draining: check the drain hose for kinks and clean the pump filter (usually accessed via a small panel at the front bottom)",
          "If not spinning: redistribute the load — unbalanced heavy items like towels can prevent spinning",
          "Note any error codes on the display and include them in your report",
        ],
      },
      {
        id: "extractor-fan",
        name: "Extractor Fan Not Working",
        description: "Kitchen or bathroom extractor fan not functioning or making noise",
        tips: [
          "Check that the extractor fan is switched on — look for a wall switch or pull cord near the fan",
          "Check if the fan is connected to the light switch — try turning the light on and off",
          "Clean the fan grille and blades if accessible — dust buildup can prevent proper operation",
          "Listen for unusual sounds such as grinding or rattling, which may indicate a failing motor",
        ],
      },
      {
        id: "microwave",
        name: "Microwave Not Working",
        description: "Microwave not heating, not turning on, or display issues",
        tips: [
          "Check that the microwave is plugged in and the socket is working — try another appliance in the same socket",
          "Ensure the door closes fully and latches properly — the microwave will not operate if the door switch is not engaged",
          "Check that the turntable is properly seated in its support ring",
          "Try a reset by unplugging for 1 minute then plugging back in",
        ],
      },
      {
        id: "tumble-dryer",
        name: "Tumble Dryer Issues",
        description: "Dryer not heating, not spinning, or not drying clothes",
        tips: [
          "Check that the lint filter is clean — a blocked filter prevents proper drying and airflow",
          "Ensure the door is fully closed — the dryer will not start if the door latch is not engaged",
          "For condenser dryers: check that the water collection tank is empty and properly seated",
          "Check that the vent hose (on vented models) is not kinked or blocked",
          "Do not overload the dryer — clothes need space to tumble properly",
        ],
      },
      {
        id: "vacuum-cleaner",
        name: "Vacuum Cleaner Problems",
        description: "Vacuum not turning on, loss of suction, or unusual noises",
        tips: [
          "Check that the dustbag or dust container is not full and empty it if needed",
          "Check the filters — most vacuums have washable filters that need regular cleaning",
          "Check the hose and attachments for blockages — disconnect and look for trapped debris",
          "For cordless vacuums: ensure the battery is charged and properly connected",
          "Check the brush roll for tangled hair or string that may prevent it from rotating",
        ],
      },
      {
        id: "freezer",
        name: "Freezer Not Working",
        description: "Freezer not maintaining temperature or excessive ice buildup",
        tips: [
          "Check that the temperature setting is correct — typically -18°C for freezers",
          "Ensure the door seal is clean and the door closes fully — ice buildup on the seal can prevent proper closing",
          "Check that the freezer is not overpacked — air needs to circulate for proper cooling",
          "Listen for the compressor running — you should hear a low humming sound when it is working",
          "If ice is building up excessively, defrost the freezer following the manufacturer's instructions",
        ],
      },
      {
        id: "kettle-small-appliance",
        name: "Kettle / Small Appliance Issues",
        description: "Kettle, toaster, or other small appliance not working",
        tips: [
          "Check that the appliance is properly plugged in and the socket is working — try another socket",
          "For kettles: ensure the lid is properly closed and the kettle is seated correctly on its base",
          "Check for limescale buildup in kettles — descale with a shop-bought solution or vinegar and water",
          "For toasters: empty the crumb tray and check for stuck bread or debris",
        ],
      },
      {
        id: "washer-dryer-combo",
        name: "Washer-Dryer Combo Issues",
        description: "Combined washer-dryer not washing or drying properly",
        tips: [
          "Check that the lint filter and drain filter are both clean",
          "Ensure the water supply is turned on and the hoses are not kinked",
          "Do not overload — combo units need extra space for the drying cycle to work",
          "If drying is poor, check that the condenser unit or vent is clean",
          "Try running separate wash and dry cycles rather than a combined programme",
        ],
      },
    ],
  },
  {
    id: "doors-windows",
    name: "Doors and Windows",
    icon: "🚪",
    subcategories: [
      {
        id: "door-wont-close",
        name: "Door Won't Close / Latch",
        description: "Door misaligned or latch not engaging",
        tips: [
          "Check for debris or obstructions in the door frame or latch plate",
          "Tighten any loose hinge screws with a screwdriver",
          "Apply a small amount of lubricant (WD-40) to squeaky hinges",
          "Check if the door has sagged or the frame has shifted — look for uneven gaps around the door",
          "Do not force the door closed as this could damage the frame or latch",
        ],
      },
      {
        id: "lock-sticking",
        name: "Lock Sticking or Key Won't Turn",
        description: "Difficulty using locks or keys",
        tips: [
          "Apply graphite lubricant (from a hardware shop) or a small amount of WD-40 into the keyhole",
          "Insert the key and gently jiggle it while turning after lubricating",
          "Verify you are using the correct key — copies can sometimes be slightly off",
          "Do not force the key — it could break inside the lock",
          "For electronic locks: try replacing the batteries first",
        ],
      },
      {
        id: "window-wont-open-close",
        name: "Window Won't Open / Close",
        description: "Window stuck or difficult to operate",
        tips: [
          "Ensure all window locks and safety latches are fully disengaged",
          "Clean dirt and debris from the window tracks using a damp cloth",
          "Apply silicone lubricant spray to the tracks after cleaning",
          "Do not apply excessive force — you could crack or break the glass",
        ],
      },
      {
        id: "broken-window-glass",
        name: "Broken Window Glass",
        description: "Cracked or shattered window pane",
        tips: [
          "Do NOT attempt to remove or replace the glass yourself",
          "Carefully collect any large pieces wearing thick gloves, then vacuum up small fragments",
          "Cover the opening with cardboard, plastic sheeting, or a bin bag taped securely to keep out weather and insects",
          "Keep children and pets well away from the area",
          "For ground-floor windows this is a security concern — report it immediately",
        ],
      },
      {
        id: "window-restrictor",
        name: "Window Restrictor Broken",
        description: "Safety restrictor on a window is broken or missing",
        tips: [
          "If a child or vulnerable person uses the room, keep the window fully closed and locked until it is fixed",
          "Take a clear photo showing the restrictor and how it is broken or detached — this helps us order the correct replacement",
        ],
      },
      {
        id: "letterbox-broken",
        name: "Letterbox Broken",
        description: "Letterbox flap, spring or surround is broken",
        tips: [
          "Tape the flap closed temporarily to keep weather out and stop it banging in the wind",
          "Take a clear photo of the letterbox from the outside so we can order the right part",
        ],
      },
    ],
  },
  // Stub categories — subcategories to be added from the CSV
  { id: "pests", name: "Pests and Environmental", icon: "🐛", subcategories: [] },
  { id: "bathroom", name: "Bathroom Fittings", icon: "🛁", subcategories: [] },
  { id: "kitchen", name: "Kitchen", icon: "🍳", subcategories: [] },
  { id: "lighting", name: "Lighting", icon: "💡", subcategories: [] },
  { id: "walls-ceilings", name: "Walls, Ceilings and Floors", icon: "🧱", subcategories: [] },
  { id: "security", name: "Security and Safety", icon: "🔒", subcategories: [] },
  { id: "garden", name: "External and Garden", icon: "🌿", subcategories: [] },
  { id: "furniture", name: "Furniture and Furnishing", icon: "🛋️", subcategories: [] },
  { id: "internet", name: "Internet, TV and Phone", icon: "📡", subcategories: [] },
  { id: "communal", name: "Communal Areas", icon: "🏢", subcategories: [] },
  { id: "other", name: "Other / Not Sure", icon: "🔧", subcategories: [] },
];
