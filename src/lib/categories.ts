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
  isEmergency?: boolean;
  subcategories: Subcategory[];
};

const CONTACTS = {
  landlady: "07973 834611",
  landlord2: "07790 498859",
};

const contactLine = `${CONTACTS.landlady} or ${CONTACTS.landlord2}`;

export const CATEGORIES: Category[] = [
  {
    id: "emergency",
    name: "Emergency",
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
          `Once safe, contact the property managers on ${contactLine}`,
          "Do not re-enter the property until emergency services declare it safe",
        ],
      },
      {
        id: "gas-leak",
        name: "Gas Leak",
        description: "Smell of gas or suspected gas leak",
        isUrgent: true,
        tips: [
          "LEAVE THE PREMISES IMMEDIATELY. Do not use electrical switches or open flames",
          "Do NOT turn any lights on or off",
          "Once outside, call the National Grid Gas Emergency Service: 0800 111 999",
          "Open windows and doors if safe to do so before leaving",
          `After calling emergency services, contact the property managers on ${contactLine}`,
        ],
      },
      {
        id: "major-water-leak",
        name: "Major Water Leak / Flooding",
        description: "Burst pipe or significant flooding",
        isUrgent: true,
        tips: [
          "If it is safe to do so, turn off the main water supply straight away. The stopcock is usually under the sink",
          "Turn off electricity at the mains if water is near electrical outlets or appliances",
          "Move valuables and electronics away from the water",
          "Use towels, buckets, or mops to contain the water if possible",
          `Contact the property managers immediately on ${contactLine}`,
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
          `Contact the property managers immediately on ${contactLine}. Heating failure in extreme cold is an emergency`,
          "Keep internal doors closed to conserve heat in occupied rooms",
        ],
      },
      {
        id: "break-in",
        name: "Break-in or Forced Entry",
        description: "Property has been broken into or door/window forced",
        isUrgent: true,
        tips: [
          "If anyone is hurt or you think the intruder may still be inside, leave the property and call 999 first",
          "Once safe, report it to the police on 101 and get a crime reference number. You will need it",
          "Take clear photos of damaged doors, windows or locks before anything is touched or boarded up",
        ],
      },
      {
        id: "power-loss-vulnerable",
        name: "Total Power Loss: Vulnerable Occupant",
        description: "No power and someone in the property is elderly, disabled, has a baby, or needs medical equipment",
        isUrgent: true,
        tips: [
          "Check whether neighbours also have no power. If so it is a network issue: call 105 (free, 24/7)",
          "If power is only off in your property, check the main switch in the consumer unit / fuse box is still up",
          "Do NOT use candles for lighting. Use phone torches instead",
          "Keep fridge and freezer doors closed to preserve food",
          `Report it to the property managers on ${contactLine}`,
        ],
      },
    ],
  },
  {
    id: "heating",
    name: "Heating",
    subcategories: [
      {
        id: "single-radiator",
        name: "Single Radiator Not Working",
        description: "One radiator or room heater not functioning",
        tips: [
          "Ensure the radiator valve is fully open (turn the control knob counterclockwise)",
          "Check if the radiator is cold at the top but warm at the bottom. This indicates trapped air. You can bleed the radiator using a radiator key",
          "If the radiator has a thermostatic valve (TRV), make sure it is not set to off or a very low setting",
          "If the radiator is warm at the top but cold at the bottom, it may have sludge buildup. This requires professional attention",
        ],
      },
      {
        id: "no-heat-entire",
        name: "No Heat: Entire Property",
        description: "Complete heating system failure",
        tips: [
          "Check the heating programmer is set to continuous for heating",
          "Check the boiler power switch is turned on. It is usually on the wall near the boiler",
          "Make sure the gas supply valve is open. Do NOT try to relight the pilot light yourself",
        ],
      },
      {
        id: "thermostat-issues",
        name: "Thermostat Issues",
        description: "Thermostat not responding or controlling temperature",
        tips: [
          "Check the heating programmer is set to continuous for heating",
          "Set the temperature higher than the current room temperature",
          "Wait 5 minutes after changing any setting. Some thermostats have a built in delay",
        ],
      },
    ],
  },
  {
    id: "plumbing-water",
    name: "Plumbing and Water",
    subcategories: [
      {
        id: "no-hot-water",
        name: "No Hot Water",
        description: "Complete absence of hot water",
        tips: [
          "Check the heating programmer is set to continuous for hot water",
          "Check the boiler power switch is turned on. It is usually on the wall near the boiler",
          "If a lot of hot water has just been used, wait 15 to 30 minutes for the tank to reheat and try again",
          "Check the temperature setting on the water heater. It should be around 60°C",
        ],
      },
      {
        id: "no-water-low-pressure",
        name: "No Water / Low Pressure",
        description: "No water flow or significantly reduced pressure",
        tips: [
          "Check with neighbours to see if there is an area-wide outage. You can also check your water provider's website",
          "Locate the main water shut-off valve and ensure it is fully open",
          "For a single tap or shower: unscrew the aerator or showerhead and clean out limescale. Soak in vinegar for an hour",
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
          "Try using a plunger. Create a tight seal over the drain and pump vigorously",
          "Pour boiling water down the drain to help dissolve grease buildup",
          "Use Mr Muscle drain gel, following the instructions on the bottle. You can buy it from any supermarket",
        ],
      },
      {
        id: "toilet-issues",
        name: "Toilet Issues",
        description: "Running, clogged, or non-flushing toilet",
        tips: [
          "For a blocked toilet, use a plunger to create suction and shift the blockage. If that does not work, pour in chemical cleaner and leave it for an hour before flushing",
          "For a running toilet: lift the cistern lid and check if the flapper valve is sealing properly",
          "Ensure the float ball or cup is not stuck. It should move freely up and down",
          "If the toilet will not flush, check that the water supply valve behind or below the toilet is fully open",
          "Check the water level in the cistern. It should be about 2.5cm below the overflow tube",
        ],
      },
    ],
  },
  {
    id: "electrical",
    name: "Electrical",
    subcategories: [
      {
        id: "power-outage",
        name: "Power Outage",
        description: "Complete or partial loss of electrical power",
        tips: [
          "Check if neighbours have power to determine if it is an area-wide outage, or call 105 (free, 24/7)",
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
          "For ceiling lights: replace the bulb first. It is often just a blown bulb",
          "Check if a nearby wall switch might control the socket",
          "Do NOT use sockets that are loose, sparking, blackened, or making buzzing noises. Report immediately",
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
          "If the breaker trips immediately even with nothing plugged in, there may be a short circuit. Leave it off and report it",
          "Do not repeatedly reset a breaker that keeps tripping instantly. This is a safety hazard",
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
          "Clean the alarm by gently vacuuming or blowing out dust. Dust buildup can cause false alarms",
          "Never disable or remove smoke detectors. It is illegal and dangerous",
          "If the alarm sounds continuously with no visible fire or smoke, evacuate the property and call 999",
        ],
      },
    ],
  },
  {
    id: "appliances",
    name: "Appliances",
    subcategories: [
      {
        id: "fridge-not-cooling",
        name: "Refrigerator Not Cooling",
        description: "Fridge not maintaining proper temperature",
        tips: [
          "Check that the fridge is plugged in and the socket has power",
          "Verify the temperature dial is set correctly, not turned to off or the warmest setting",
          "Ensure the door seals properly: close the door on a piece of paper. If it slides out easily, the seal may need replacing",
          "Do not overfill the fridge. Air needs to circulate to cool properly",
          "Check for excessive frost buildup in the freezer compartment. If heavily frosted, it may need manual defrosting",
        ],
      },
      {
        id: "oven-stove",
        name: "Oven / Stove Not Working",
        description: "Range or oven not heating properly",
        tips: [
          "For electric ovens: check if the circuit breaker has tripped and reset if needed",
          "Ensure the oven is set to the correct function (e.g. Bake, Grill) and temperature",
          "For gas hobs: listen for the clicking sound of the igniter. If it clicks but does not light, ensure the gas supply is on",
          "Clean any food spills around gas burners. Debris can block the igniter",
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
          "Clean the filter at the bottom of the dishwasher. A clogged filter prevents proper cleaning and draining",
          "Make sure dishes are not blocking the spray arms from rotating",
          "Check that the door latch is closing securely. The dishwasher will not start if the door is not fully closed",
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
          "If not spinning: redistribute the load. Unbalanced heavy items like towels can prevent spinning",
          "Note any error codes on the display and include them in your report",
        ],
      },
      {
        id: "extractor-fan",
        name: "Extractor Fan Not Working",
        description: "Kitchen or bathroom extractor fan not functioning or making noise",
        tips: [
          "Check that the extractor fan is switched on. Look for a wall switch or pull cord near the fan",
          "Check if the fan is connected to the light switch. Try turning the light on and off",
          "Clean the fan grille and blades if accessible. Dust buildup can prevent proper operation",
          "Listen for unusual sounds such as grinding or rattling, which may indicate a failing motor",
        ],
      },
      {
        id: "microwave",
        name: "Microwave Not Working",
        description: "Microwave not heating, not turning on, or display issues",
        tips: [
          "Check that the microwave is plugged in and the socket is working. Try another appliance in the same socket",
          "Ensure the door closes fully and latches properly. The microwave will not operate if the door switch is not engaged",
          "Check that the turntable is properly seated in its support ring",
          "Try a reset by unplugging for 1 minute then plugging back in",
        ],
      },
      {
        id: "tumble-dryer",
        name: "Tumble Dryer Issues",
        description: "Dryer not heating, not spinning, or not drying clothes",
        tips: [
          "Check that the lint filter is clean. A blocked filter prevents proper drying and airflow",
          "Ensure the door is fully closed. The dryer will not start if the door latch is not engaged",
          "For condenser dryers: check that the water collection tank is empty and properly seated",
          "Check that the vent hose (on vented models) is not kinked or blocked",
          "Do not overload the dryer. Clothes need space to tumble properly",
        ],
      },
      {
        id: "vacuum-cleaner",
        name: "Vacuum Cleaner Problems",
        description: "Vacuum not turning on, loss of suction, or unusual noises",
        tips: [
          "Check that the dustbag or dust container is not full and empty it if needed",
          "Check the filters. Most vacuums have washable filters that need regular cleaning",
          "Check the hose and attachments for blockages. Disconnect and look for trapped debris",
          "Check the brush roll for tangled hair or string that may prevent it from rotating",
        ],
      },
      {
        id: "freezer",
        name: "Freezer Not Working",
        description: "Freezer not maintaining temperature or excessive ice buildup",
        tips: [
          "Check that the temperature setting is correct, typically -18°C for freezers",
          "Ensure the door seal is clean and the door closes fully. Ice buildup on the seal can prevent proper closing",
          "Check that the freezer is not overpacked. Air needs to circulate for proper cooling",
          "Listen for the compressor running. You should hear a low humming sound when it is working",
          "If ice is building up excessively, defrost the freezer following the manufacturer's instructions",
        ],
      },
    ],
  },
  {
    id: "doors-windows",
    name: "Doors and Windows",
    subcategories: [
      {
        id: "lost-key",
        name: "Lost Key",
        description: "Key lost or missing",
        tips: [
          "Retrace your steps and check everywhere you have been. Most keys turn up",
          "If you cannot find it, a replacement must be ordered and the cost is £80",
          "Replacements come from Italy and take 5 working days to arrive once payment has been made",
          "Pay to: Eastwards Property Group, account number 01817299, sort code 40-11-13",
        ],
      },
      {
        id: "door-wont-close",
        name: "Door Won't Close / Latch",
        description: "Door misaligned or latch not engaging",
        tips: [
          "Check for debris or obstructions in the door frame or latch plate",
          "Tighten any loose hinge screws with a screwdriver",
          "Apply a small amount of lubricant (WD-40) to squeaky hinges",
          "Check if the door has sagged or the frame has shifted. Look for uneven gaps around the door",
          "Do not force the door closed as this could damage the frame or latch",
        ],
      },
      {
        id: "lock-sticking",
        name: "Lock Sticking or Key Won't Turn",
        description: "Difficulty using locks or keys",
        tips: [
          "Clean the key first with soapy water and dry it thoroughly to remove any debris",
          "Apply graphite lubricant from a hardware shop, or a small amount of WD-40, into the keyhole",
          "Insert the key and gently jiggle it while turning after lubricating",
          "Verify you are using the correct key. Copies can sometimes be slightly off",
          "Do not force the key. It could break inside the lock",
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
          "Do not apply excessive force. You could crack or break the glass",
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
          "For ground-floor windows this is a security concern. Report it immediately",
        ],
      },
      {
        id: "window-restrictor",
        name: "Window Restrictor Broken",
        description: "Safety restrictor on a window is broken or missing",
        tips: [
          "If a child or vulnerable person uses the room, keep the window fully closed and locked until it is fixed",
          "Take a clear photo showing the restrictor and how it is broken or detached. This helps us order the correct replacement",
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
  {
    id: "pests",
    name: "Pests and Environmental",
    subcategories: [
      {
        id: "pest-infestation",
        name: "Pest Infestation",
        description: "Insects, ants, or other pests found in the property",
        tips: [
          "Identify and seal obvious entry points. Check gaps around pipes, skirting boards, and external doors",
          "Remove accessible food sources: keep worktops clean and store food in sealed containers",
          "Check that your bins are not overflowing and attracting pests",
          "Take photos of any droppings, damage, or pest activity to include with your report",
          "Do not use pesticide sprays without permission. Some can damage surfaces or affect other residents",
        ],
      },
      {
        id: "rats-mice",
        name: "Rats or Mice",
        description: "Sightings, droppings, or scratching noises indicating rodents",
        tips: [
          "Do not attempt to handle or trap rodents yourself. A professional pest controller is required",
          "Block visible gaps around pipes, under doors, and in skirting boards with steel wool as a temporary measure",
          "Store all food in sealed hard containers and remove any pet food left out overnight",
          "Note where you have seen activity. This helps the pest controller locate entry points efficiently",
          "Report immediately: rodent infestations spread quickly and are a health hazard",
        ],
      },
    ],
  },
  {
    id: "bathroom",
    name: "Bathroom Fittings",
    subcategories: [
      {
        id: "shower-weak-flow",
        name: "Shower Not Working or Weak Flow",
        description: "No water, weak pressure, or shower not heating properly",
        tips: [
          "Unscrew the shower head and soak it in white vinegar overnight to clear limescale. This is the most common cause of weak flow",
          "Check the shower temperature and flow control is set correctly",
          "For electric showers: check the circuit breaker has not tripped in the fuse box",
          "If pressure is low throughout the whole property, see the Plumbing and Water section instead",
        ],
      },
      {
        id: "bath-basin-draining",
        name: "Basin Draining Slowly",
        description: "Water draining very slowly or standing in the basin",
        tips: [
          "Remove and clean the drain cover or plug. Built-up hair is the most common cause",
          "Use a plunger: create a firm seal over the drain and pump vigorously",
          "Use Mr Muscle sink unblocker, following the instructions on the bottle. You can buy it from any supermarket",
        ],
      },
      {
        id: "tap-dripping",
        name: "Tap Dripping or Leaking",
        description: "Tap dripping when turned off, or leaking around the base",
        tips: [
          "Ensure the tap is fully turned off. Some taps require a firm twist",
          "Place a towel under the tap to catch drips and prevent surface damage",
          "If water is leaking from a pipe under the sink, turn the isolation valve (under the sink, clockwise) to cut the water supply to that tap",
          "Do not attempt to dismantle the tap. Report it and we will arrange a plumber",
        ],
      },
      {
        id: "toilet-seat",
        name: "Toilet Seat Loose or Broken",
        description: "Toilet seat wobbling, cracked, or broken off the hinge",
        tips: [
          "Check whether the fixing bolts at the back of the seat are simply loose. Some can be tightened by hand or with a screwdriver",
          "Avoid using a cracked seat. The edges can be sharp and cause injury",
          "Note the toilet brand or model if visible on the cistern. This helps us order the correct replacement quickly",
        ],
      },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    subcategories: [
      {
        id: "cupboard-hinge-broken",
        name: "Cupboard Door or Hinge Broken",
        description: "Door hanging off, hinge snapped, or door will not close properly",
        tips: [
          "Check whether the hinge screws are simply loose. Tighten with a screwdriver",
          "Many kitchen hinges have a small adjustment screw on the barrel that can realign a door that is slightly off",
          "If the hinge is physically snapped, lean the door safely against the wall rather than leaving it hanging",
          "Take a clear photo of the broken hinge and its position in the kitchen",
        ],
      },
      {
        id: "kitchen-sink-blocked",
        name: "Kitchen Sink Blocked",
        description: "Sink draining slowly or not draining at all",
        tips: [
          "Clear the sink strainer or filter basket first. Grease and food debris is the most common cause",
          "Pour boiling water down the drain to dissolve grease buildup",
          "Use Mr Muscle sink unblocker, following the instructions on the bottle. You can buy it from any supermarket",
          "If water is backing up into the dishwasher or washing machine, do not run those appliances until the blockage is cleared",
        ],
      },
      {
        id: "worktop-damaged",
        name: "Worktop or Surface Damaged",
        description: "Worktop burnt, cracked, chipped, or edge lifting away",
        tips: [
          "Avoid using the damaged area for food preparation. Cracked or lifting surfaces can harbour bacteria",
          "Do not attempt to re-glue a lifting worktop edge yourself. The fixings below may also need attention",
          "Take photos of the damage from multiple angles showing the full extent",
        ],
      },
    ],
  },
  {
    id: "lighting",
    name: "Lighting",
    subcategories: [
      {
        id: "ceiling-light",
        name: "Ceiling Light Not Working",
        description: "Light fitting still not working after changing the bulb",
        tips: [
          "Try a brand-new bulb, even bulbs fresh out of the box can occasionally be faulty",
          "Check the fuse box for a tripped breaker on the lighting circuit and reset if needed",
          "Check whether other lights in the same room or area are working. If not, it is a circuit issue",
          "If the fitting flickers, buzzes, or smells of burning, turn it off at the wall and do not use it",
          "If none of the above works, report it and an electrician will be arranged",
        ],
      },
      {
        id: "outdoor-light",
        name: "External or Security Light Not Working",
        description: "Outdoor light or motion-sensor (PIR) light not coming on",
        tips: [
          "Check the fuse box for a tripped outdoor lighting circuit",
          "For PIR (motion sensor) lights: check the sensor head is not covered or obstructed, and that the sensitivity or timer settings have not been knocked",
          "Do not attempt any work on outdoor electrical fittings yourself. We will send a qualified electrician",
        ],
      },
    ],
  },
  {
    id: "walls-ceilings",
    name: "Walls, Ceilings and Floors",
    subcategories: [
      {
        id: "mould-condensation",
        name: "Mould or Condensation",
        description: "Black mould spots, damp patches, or heavy condensation on walls or windows",
        tips: [
          "Open windows daily for ventilation, even 10 minutes in the morning makes a significant difference",
          "Always use the extractor fan when showering or cooking, and leave it running for 15 minutes after",
          "Avoid drying laundry indoors. If you have no choice, open a window in that room",
          "Move furniture away from walls to encourage air circulation",
          "Wipe condensation from windows and windowsills with a dry cloth each morning",
          "Small surface mould spots can be cleaned with diluted bleach (1 part bleach to 4 parts water) wearing rubber gloves",
          "If mould covers a large area, is on the ceiling, or keeps returning, report it. Do not attempt to clean it yourself",
        ],
      },
      {
        id: "damp-patch",
        name: "Damp Patch or Staining",
        description: "Water staining, damp patches, or discolouration on walls or ceiling",
        tips: [
          "Check whether the affected wall is directly beneath a bathroom or kitchen above. A leak from the floor above is a common cause",
          "Find out which room was using the shower before the leak appeared",
          "Check whether staining worsens after heavy rain. This can point to a roof or gutter issue",
          "Do not paint over damp patches. The damp will come back and may spread further underneath",
          "Photograph the full extent of the stain and note whether it is growing or stable",
        ],
      },
      {
        id: "damaged-flooring",
        name: "Damaged or Lifting Flooring",
        description: "Torn carpet, lifting vinyl, cracked tiles, or loose floorboards",
        tips: [
          "Tape down any lifted edges temporarily to prevent a trip hazard",
          "Avoid walking on cracked or broken tiles. Edges can be sharp",
          "Carpet edges lifting at doorways are a common trip hazard. Report these promptly",
          "Take photos showing the full area affected",
        ],
      },
      {
        id: "crack-hole",
        name: "Crack or Hole in Wall or Ceiling",
        description: "Visible crack, hole, or crumbling plaster",
        tips: [
          "Hairline cracks in plaster are usually normal structural settling. Report so we can monitor them",
          "Cracks wider than 3mm, diagonal cracks, or cracks that appear to be growing should be reported promptly",
          "Do not attempt to fill cracks yourself as this can mask underlying movement",
          "If plaster is bulging or sounds hollow when tapped gently, avoid touching the area in case it falls",
        ],
      },
    ],
  },
  {
    id: "security",
    name: "Security and Safety",
    subcategories: [
      {
        id: "carbon-monoxide",
        name: "Carbon Monoxide Alarm Sounding",
        description: "CO detector beeping continuously or showing an alert",
        isUrgent: true,
        tips: [
          "EVACUATE IMMEDIATELY. Leave all doors open behind you to ventilate the building",
          "Do not turn any lights or appliances on or off as you leave",
          "Once outside, call the Gas Emergency line: 0800 111 999",
          "Call 999 if anyone feels unwell, dizzy, has a headache, or seems confused",
          "Do NOT re-enter the property until emergency services confirm it is safe",
        ],
      },
      {
        id: "smoke-alarm-security",
        name: "Smoke Alarm Beeping or Faulty",
        description: "Smoke alarm chirping, triggering without reason, or not working at all",
        tips: [
          "A slow single chirp (every 30–60 seconds) means the battery needs replacing. Use a fresh 9V battery",
          "After replacing the battery, press and hold the test button to reset and confirm it is working",
          "Gently vacuum dust from the vents. Dust buildup is a common cause of false alarms",
          "Never remove or disable a smoke detector. It is a legal requirement",
          "If the alarm sounds continuously with no sign of fire or smoke, evacuate and call 999",
        ],
      },
      {
        id: "entry-intercom",
        name: "Entry Phone or Intercom Not Working",
        description: "Cannot hear or speak to visitors on the intercom",
        tips: [
          "Check that the handset inside the property is fully seated in its cradle",
          "Note whether the problem is hearing the caller, being heard, or no sound at all. It helps us identify the fault",
        ],
      },
    ],
  },
  {
    id: "garden",
    name: "External and Garden",
    subcategories: [
      {
        id: "fence-damaged",
        name: "Fence Damaged or Fallen",
        description: "Fence panel blown down, broken, or leaning significantly",
        tips: [
          "Do not attempt to re-fix fence panels yourself. They are heavier and more involved than they look",
          "If the gap creates a security or safety concern, flag this clearly in your report",
          "Take photos showing the damage and its location relative to the property",
        ],
      },
      {
        id: "pathway-damaged",
        name: "Pathway, Step or Paving Damaged",
        description: "Cracked or uneven paving creating a trip hazard",
        tips: [
          "Mark the hazard visibly (e.g. a plant pot or object) while waiting for repair",
          "Avoid the damaged area in wet or icy conditions",
          "Take clear photos showing the damage and how it relates to the walkway or entrance",
        ],
      },
    ],
  },
  {
    id: "furniture",
    name: "Furniture and Furnishing",
    subcategories: [
      {
        id: "wardrobe-broken",
        name: "Wardrobe or Drawers Broken",
        description: "Wardrobe door off its rail, drawer mechanism broken, or shelving collapsed",
        tips: [
          "For a wardrobe door off its track: do not force it back onto the rail. The rollers or track may need replacing",
          "Remove the contents from any collapsed shelf before the weight causes further damage",
          "Take photos showing the broken area clearly",
        ],
      },
      {
        id: "furniture-damaged",
        name: "Other Furniture Damaged",
        description: "Chair, desk, sofa, or other furniture structurally broken",
        tips: [
          "Stop using a broken chair or table immediately. A collapsing piece of furniture can cause injury",
          "Note when and how the damage occurred. This helps establish responsibility",
          "Take clear photos of the damage",
        ],
      },
    ],
  },
  {
    id: "internet",
    name: "Internet, TV and Phone",
    subcategories: [
      {
        id: "internet-not-working",
        name: "Internet Not Working",
        description: "Wi-Fi not connecting",
        tips: [
          "Unplug the router from the mains, wait 30 seconds, then plug it back in. This resolves the majority of broadband issues",
          "Check whether other devices in the property can connect. If yes, the issue is with your device, not the router",
          "Check the router's lights. A red or off broadband indicator usually means a line fault",
          "If the problem continues, contact your provider directly",
        ],
      },
      {
        id: "tv-signal",
        name: "TV Signal or Aerial Issue",
        description: "No TV signal, poor picture, or aerial socket not working",
        tips: [
          "Check all aerial cable connections at the TV and at the wall socket. Ensure they are pushed in firmly",
          "Run an automatic channel scan / retune from your TV settings menu",
          "A quick search for your postcode and 'TV signal' will usually show if a regional transmitter fault is affecting your area",
          "Streaming services (iPlayer, Netflix, etc.) work via Wi-Fi and are unaffected by an aerial issue",
        ],
      },
    ],
  },
  {
    id: "communal",
    name: "Communal Areas",
    subcategories: [
      {
        id: "communal-lighting",
        name: "Hallway or Stairway Lighting Not Working",
        description: "Lights in the shared hallway, stairwell, or landing not working",
        tips: [
          "Note whether it is a single fitting or the entire hallway. This helps identify the fault",
          "If the light is sensor or timer activated, check whether the sensor may be blocked or the settings changed",
          "Report this urgently. An unlit stairway or hallway is a safety hazard",
        ],
      },
      {
        id: "communal-door",
        name: "Communal Door Not Closing or Locking",
        description: "Shared entrance door, fire door, or gate not closing or latching properly",
        tips: [
          "Check for any obstruction preventing the door from closing fully",
          "Try pulling the door firmly closed. Some communal doors need a firm push to engage the latch",
          "Report immediately if the front door is not securing. This is a security issue for all residents",
        ],
      },
      {
        id: "communal-maintenance",
        name: "Communal Area Needs Attention",
        description: "Shared spaces are untidy, damaged, or require general maintenance",
        tips: [
          "Do not move items left by other tenants yourself. Report it and we will deal with it",
          "Take photos to clearly show the issue and its location within the building",
          "For recurring issues, let us know. We may need to address expectations with all residents",
        ],
      },
    ],
  },
  {
    id: "other",
    name: "Other / Not Sure",
    subcategories: [],
  },
];
