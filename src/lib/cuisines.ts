// Ingredients by culture: the same five food groups as lib/foods.ts, with everyday ingredients from
// cuisines around the world so members can hit their targets with the food they already eat.
// Ingredients, not dishes or meals. Each one is sized so a serving matches its group's typical serving
// (the 80% rule in lib/foods.ts); anything that doesn't is left out of the lists automatically.
// Values are rounded per serving from USDA FoodData Central-style figures; preparation varies.
// Pure module: safe on the server, in the browser and in the mobile API.

import { FOOD_GROUPS, MIN_MATCH, similarity, type Food, type FoodGroupId } from "./foods";

export type Region = "Americas" | "Europe" | "Middle East & North Africa" | "Sub-Saharan Africa" | "South Asia" | "East Asia" | "Southeast Asia & Pacific";
export const REGIONS: Region[] = ["Americas", "Europe", "Middle East & North Africa", "Sub-Saharan Africa", "South Asia", "East Asia", "Southeast Asia & Pacific"];

export type Cuisine = { id: string; label: string; region: Region; note?: string; foods: Partial<Record<FoodGroupId, Food[]>> };

const f = (name: string, serving: string, kcal: number, protein: number, carbs: number, fat: number): Food => ({ name, serving, kcal, protein, carbs, fat });

// Shared ingredients, so values stay consistent across cuisines.
const CHICKEN = (n = "Chicken breast, skinless") => f(n, "3 oz cooked", 128, 26, 0, 2.7);
const SHRIMP = (n = "Shrimp") => f(n, "3 oz cooked", 84, 20, 0.2, 0.2);
const WHITE_FISH = (n: string) => f(n, "3 oz cooked", 100, 21, 0, 1.5);
const TUNA = (n = "Tuna") => f(n, "3 oz cooked", 110, 25, 0, 1);
const GOAT = (n = "Goat meat, lean") => f(n, "3 oz cooked", 122, 23, 0, 2.6);
const LAMB = (n = "Lamb leg, lean") => f(n, "2½ oz cooked", 135, 20, 0, 5.5);
const BEEF = (n = "Lean beef, like sirloin or eye of round") => f(n, "3 oz cooked", 145, 24, 0, 4.5);
const PORK = (n = "Pork tenderloin") => f(n, "3 oz cooked", 122, 22, 0, 3);
const SQUID = (n = "Squid") => f(n, "4 oz cooked", 119, 20, 4, 1.7);
const EGG_WHITE = (n = "Egg whites") => f(n, "¾ cup", 95, 20, 1.4, 0.3);
const RICE_WHITE = (n = "White rice") => f(n, "½ cup cooked", 103, 2.1, 22.3, 0.2);
const LENTILS = (n = "Lentils") => f(n, "½ cup cooked", 115, 9, 20, 0.4);
const CHICKPEAS = (n = "Chickpeas") => f(n, "½ cup cooked", 134, 7.3, 22.5, 2.1);
const BLACK_BEANS = (n = "Black beans") => f(n, "½ cup cooked", 114, 7.6, 20.4, 0.5);
const POTATO = (n = "Potato") => f(n, "1 small, boiled", 112, 2.4, 26, 0.1);
const SWEET_POTATO = (n = "Sweet potato") => f(n, "1 medium, baked", 103, 2.3, 23.6, 0.2);
const OATS = (n = "Rolled oats") => f(n, "⅓ cup dry", 100, 3.5, 18, 1.8);
const MILK = (n = "Milk, 1%") => f(n, "1 cup", 102, 8.2, 12.2, 2.4);
const YOGURT = (n = "Plain low-fat yogurt") => f(n, "¾ cup", 115, 9.5, 13, 2.8);
const GREEK_YOGURT = (n = "Greek yogurt, plain 2%") => f(n, "¾ cup", 124, 17, 6.8, 3.3);
const KEFIR = (n = "Kefir, low-fat plain") => f(n, "1 cup", 104, 9.2, 11.7, 2.3);
const COTTAGE = (n = "Cottage cheese, 2%") => f(n, "½ cup", 92, 12, 5, 2.6);
const OLIVE_OIL = (n = "Olive oil") => f(n, "1 tsp", 40, 0, 0, 4.5);
const OLIVES = (n = "Olives") => f(n, "8 large", 40, 0.3, 2, 3.7);
const AVOCADO = (n = "Avocado") => f(n, "2 tbsp mashed", 48, 0.6, 2.6, 4.4);
const ALMONDS = (n = "Almonds") => f(n, "7 nuts", 49, 1.8, 1.8, 4.2);
const WALNUTS = (n = "Walnuts") => f(n, "4 halves", 52, 1.2, 1.1, 5.2);
const PEANUTS = (n = "Peanuts") => f(n, "1 tbsp", 52, 2.3, 1.4, 4.5);
const SESAME_OIL = (n = "Sesame oil") => f(n, "1 tsp", 40, 0, 0, 4.5);
const COCONUT_MILK = (n = "Coconut milk") => f(n, "2 tbsp", 55, 0.6, 0.8, 5.7);
const TAHINI = (n = "Tahini (sesame paste)") => f(n, "1½ tsp", 45, 1.3, 1.6, 4);
const GHEE = (n = "Ghee") => f(n, "1 tsp", 42, 0, 0, 4.7);
const PISTACHIOS = (n = "Pistachios") => f(n, "12 nuts", 48, 1.7, 2.3, 3.9);
const SEEDS = (n: string) => f(n, "1 tbsp", 57, 2.1, 1.8, 4.8);
const MANGO = (n = "Mango") => f(n, "½ cup", 50, 0.7, 12.4, 0.3);
const PAPAYA = (n = "Papaya") => f(n, "1 cup", 55, 0.9, 13.7, 0.4);
const PINEAPPLE = (n = "Pineapple") => f(n, "¾ cup", 62, 0.7, 16.3, 0.1);
const ORANGE = (n = "Orange") => f(n, "1 medium", 62, 1.2, 15.4, 0.2);
const BANANA = (n = "Banana") => f(n, "½ medium", 53, 0.7, 13.5, 0.2);
const TOMATO = (n = "Tomatoes") => f(n, "2 medium", 44, 2.2, 9.6, 0.5);
const CARROTS = (n = "Carrots") => f(n, "1 cup chopped", 52, 1.2, 12.3, 0.3);
const CABBAGE = (n = "Cabbage") => f(n, "2 cups shredded", 44, 2.3, 10.3, 0.2);
const GREENS = (n: string) => f(n, "2 cups cooked", 50, 4.4, 9.4, 0.6);
const OKRA = (n = "Okra") => f(n, "1½ cups cooked", 53, 2.8, 10.8, 0.3);
const EGGPLANT = (n = "Eggplant") => f(n, "2 cups cooked", 70, 1.6, 17.2, 0.5);
const PEPPERS = (n = "Bell peppers") => f(n, "1 large", 51, 1.6, 9.9, 0.5);
const CUCUMBER = (n = "Cucumber") => f(n, "2 cups sliced", 32, 1.4, 7.6, 0.2);
const BROCCOLI = (n = "Broccoli") => f(n, "1½ cups florets", 46, 3.8, 9, 0.5);
const NOODLES = (n = "Rice noodles") => f(n, "½ cup cooked", 96, 0.8, 21.9, 0.2);
const MELON_SEEDS = (n: string) => f(n, "1 tbsp", 57, 2.7, 1.5, 4.8);
const VEG_OIL = (n = "Vegetable oil") => f(n, "1 tsp", 40, 0, 0, 4.5);
const APPLE = (n = "Apple slices") => f(n, "1 cup", 57, 0.3, 15, 0.2);
const GUAVA = (n = "Guava") => f(n, "1½ fruits", 55, 2.1, 11.8, 0.8);
const LONG_BEANS = (n: string) => f(n, "1½ cups cooked", 55, 2.5, 12, 0.3);

export const CUISINES: Cuisine[] = [
  // ---------- Americas ----------
  {
    id: "american",
    label: "American",
    region: "Americas",
    foods: {
      protein: [CHICKEN(), f("Turkey breast", "3 oz cooked", 125, 25, 0, 2), BEEF("Lean beef, like sirloin"), TUNA("Tuna, canned in water")],
      grains: [OATS(), f("Whole-grain bread", "1 slice", 80, 4, 14, 1), POTATO("Potato, baked"), f("Corn on the cob", "1 medium ear", 99, 3.5, 21.6, 1.4)],
      produce: [f("Apple slices", "1 cup", 57, 0.3, 15, 0.2), f("Strawberries", "1 cup", 49, 1, 11.7, 0.5), BROCCOLI(), f("Green beans", "1½ cups", 51, 3, 11.5, 0.2)],
      dairy: [MILK(), GREEK_YOGURT(), COTTAGE()],
      fats: [PEANUTS("Peanut butter, 1½ tsp"), AVOCADO(), WALNUTS("Pecans or walnuts")],
    },
  },
  {
    id: "southern",
    label: "Southern US & soul food",
    region: "Americas",
    foods: {
      protein: [CHICKEN("Chicken, skinless, baked"), WHITE_FISH("Catfish, baked"), f("Turkey breast, smoked", "3 oz", 110, 20, 2, 2.5)],
      grains: [f("Black-eyed peas", "½ cup cooked", 100, 6.6, 18, 0.5), f("Grits, plain", "½ cup cooked", 80, 1.7, 17, 0.5), SWEET_POTATO(), f("Lima beans", "½ cup cooked", 108, 7.3, 19.6, 0.4)],
      produce: [GREENS("Collard greens"), OKRA(), f("Peaches", "1 large", 61, 1.4, 15, 0.4), GREENS("Turnip greens")],
      dairy: [MILK(), f("Buttermilk, low-fat", "1 cup", 98, 8.1, 11.7, 2.2)],
      fats: [PEANUTS(), WALNUTS("Pecans")],
    },
  },
  {
    id: "mexican",
    label: "Mexican",
    region: "Americas",
    foods: {
      protein: [CHICKEN("Chicken breast (pollo)"), WHITE_FISH("White fish, like tilapia (pescado)"), SHRIMP("Shrimp (camarones)"), BEEF("Lean beef (res)")],
      grains: [f("Corn tortillas", "2 small", 114, 3, 23, 1.5), BLACK_BEANS("Black beans (frijoles negros)"), f("Pinto beans", "½ cup cooked", 122, 7.7, 22.4, 0.6), f("Hominy (pozole corn)", "¾ cup", 89, 1.8, 17.7, 1.1)],
      produce: [f("Nopales (cactus paddles)", "2 cups cooked", 44, 4, 9.8, 0.2), f("Jícama", "1 cup sliced", 46, 0.9, 10.6, 0.1), TOMATO("Tomatoes and tomatillos"), PAPAYA()],
      dairy: [MILK("Milk, 1% (leche)"), YOGURT()],
      fats: [AVOCADO("Avocado (aguacate)"), SEEDS("Pumpkin seeds (pepitas)")],
    },
  },
  {
    id: "caribbean",
    label: "Caribbean",
    region: "Americas",
    note: "Jamaican, Haitian, Trinidadian, Puerto Rican, Dominican, Cuban",
    foods: {
      protein: [CHICKEN("Chicken breast, jerk-seasoned"), WHITE_FISH("Saltfish (salted cod), soaked"), GOAT("Goat meat, lean (curry goat cut)"), SHRIMP()],
      grains: [f("Green banana, boiled", "1 small", 100, 1.2, 25, 0.3), f("Plantain, boiled", "½ cup", 89, 0.8, 24, 0.1), f("Red kidney beans (rice and peas)", "½ cup cooked", 112, 7.7, 20.2, 0.4), f("Yam or dasheen, boiled", "½ cup", 79, 1, 18.7, 0.1)],
      produce: [f("Callaloo", "2 cups cooked", 56, 5.6, 10.8, 0.4), MANGO(), PAPAYA(), f("Pumpkin (calabaza)", "1½ cups cooked", 60, 2.2, 15, 0.2)],
      dairy: [MILK(), YOGURT()],
      fats: [f("Ackee", "¼ cup", 53, 1, 0.3, 5.3), COCONUT_MILK(), AVOCADO("Avocado (pear)")],
    },
  },
  {
    id: "brazilian",
    label: "Brazilian",
    region: "Americas",
    foods: {
      protein: [BEEF("Lean beef, like patinho"), CHICKEN("Chicken breast (frango)"), WHITE_FISH("White fish (peixe)")],
      grains: [BLACK_BEANS("Black beans (feijão preto)"), RICE_WHITE("White rice (arroz)"), f("Cassava (mandioca), boiled", "⅓ cup", 109, 0.9, 26, 0.2), f("Toasted cassava flour (farofa base)", "2 tbsp", 90, 0.4, 22, 0.1)],
      produce: [GREENS("Collard greens (couve)"), PAPAYA("Papaya (mamão)"), PINEAPPLE("Pineapple (abacaxi)"), f("Pumpkin (abóbora)", "1½ cups cooked", 60, 2.2, 15, 0.2)],
      dairy: [MILK(), YOGURT("Plain low-fat yogurt (iogurte natural)")],
      fats: [f("Brazil nuts", "1½ nuts", 50, 1.1, 0.9, 5.1), AVOCADO("Avocado (abacate)"), OLIVE_OIL("Olive oil (azeite)")],
    },
  },
  {
    id: "peruvian",
    label: "Peruvian & Andean",
    region: "Americas",
    foods: {
      protein: [WHITE_FISH("White fish, like corvina (ceviche fish)"), CHICKEN("Chicken breast (pollo)"), SQUID("Squid (calamar)")],
      grains: [f("Quinoa", "½ cup cooked", 111, 4, 19.7, 1.8), POTATO("Purple or yellow potato (papa)"), f("Choclo (Andean corn)", "½ cup", 90, 3, 19, 1.2), f("Lima beans (pallares)", "½ cup cooked", 108, 7.3, 19.6, 0.4)],
      produce: [f("Red onion and peppers (ají)", "1½ cups", 55, 1.6, 12.5, 0.3), f("Lúcuma or cherimoya", "½ cup", 60, 1.2, 15, 0.4), TOMATO()],
      dairy: [MILK(), YOGURT()],
      fats: [AVOCADO("Avocado (palta)"), OLIVE_OIL()],
    },
  },
  {
    id: "colombian",
    label: "Colombian & Venezuelan",
    region: "Americas",
    foods: {
      protein: [CHICKEN("Chicken breast (pollo)"), BEEF("Lean beef (carne de res)"), WHITE_FISH("Tilapia or mojarra")],
      grains: [f("Arepa (corn), small", "1 small (40 g)", 95, 2.1, 19, 1), f("Red beans (frijoles)", "½ cup cooked", 112, 7.7, 20.2, 0.4), f("Plantain, boiled", "½ cup", 89, 0.8, 24, 0.1), f("Yuca, boiled", "⅓ cup", 109, 0.9, 26, 0.2)],
      produce: [GUAVA(), PAPAYA(), TOMATO("Tomato and onion (hogao base)")],
      dairy: [MILK(), YOGURT()],
      fats: [AVOCADO("Avocado (aguacate)"), OLIVE_OIL("Vegetable or olive oil")],
    },
  },

  // ---------- Europe ----------
  {
    id: "italian",
    label: "Italian",
    region: "Europe",
    foods: {
      protein: [CHICKEN("Chicken breast (pollo)"), WHITE_FISH("White fish, like cod or sea bass"), TUNA("Tuna (tonno), in water"), f("Bresaola", "2 oz", 100, 18, 0.3, 2.5)],
      grains: [f("Whole-wheat pasta", "½ cup cooked", 87, 3.7, 18.6, 0.4), f("Cannellini beans", "½ cup cooked", 110, 7.5, 20, 0.4), f("Farro", "⅓ cup cooked", 80, 3, 17, 0.6), f("Polenta", "½ cup cooked", 85, 2, 18, 0.5)],
      produce: [TOMATO("Tomatoes (pomodori)"), f("Zucchini", "2 cups cooked", 54, 4.1, 9.7, 0.4), GREENS("Spinach or chard"), f("Figs, fresh", "1 large", 47, 0.5, 12.3, 0.2)],
      dairy: [MILK(), YOGURT(), KEFIR()],
      fats: [OLIVE_OIL("Extra-virgin olive oil"), OLIVES(), f("Pine nuts", "1½ tsp", 42, 0.8, 0.8, 4.3)],
    },
  },
  {
    id: "french",
    label: "French",
    region: "Europe",
    foods: {
      protein: [CHICKEN("Chicken breast (poulet)"), WHITE_FISH("Sole or cod"), f("Mussels (moules)", "3 oz cooked", 146, 20, 6.3, 3.8), EGG_WHITE("Egg whites (blancs d'œufs)")],
      grains: [LENTILS("Green lentils (lentilles du Puy)"), f("Baguette", "1 oz slice", 77, 2.6, 15, 0.7), POTATO("Potatoes (pommes de terre)")],
      produce: [f("Haricots verts", "1½ cups", 51, 3, 11.5, 0.2), f("Leeks", "1 cup cooked", 32, 0.8, 7.9, 0.2), f("Pear", "½ large", 50, 0.3, 13.4, 0.1), f("Ratatouille vegetables (zucchini, eggplant, pepper)", "1½ cups", 55, 2, 12, 0.4)],
      dairy: [f("Fromage blanc, 0–3%", "¾ cup", 115, 14, 7, 3), YOGURT("Yaourt nature, low-fat"), MILK()],
      fats: [OLIVE_OIL(), WALNUTS("Walnuts (noix)"), f("Butter", "1 tsp", 34, 0, 0, 3.8)],
    },
  },
  {
    id: "spanish",
    label: "Spanish & Portuguese",
    region: "Europe",
    foods: {
      protein: [WHITE_FISH("Hake (merluza / pescada)"), SQUID("Squid and octopus (calamar, pulpo)"), CHICKEN("Chicken breast (pollo / frango)"), f("Bacalao (salt cod), soaked", "3 oz", 98, 21, 0, 0.8)],
      grains: [CHICKPEAS("Chickpeas (garbanzos / grão)"), RICE_WHITE("Bomba or short-grain rice"), f("White beans (alubias / feijão branco)", "½ cup cooked", 120, 8.6, 21.6, 0.3), POTATO("Potatoes (patatas / batatas)")],
      produce: [TOMATO(), PEPPERS("Piquillo or red peppers"), f("Oranges (naranjas)", "1 medium", 62, 1.2, 15.4, 0.2), GREENS("Kale (couve, for caldo verde)")],
      dairy: [MILK(), YOGURT()],
      fats: [OLIVE_OIL("Olive oil (aceite / azeite)"), OLIVES("Olives (aceitunas / azeitonas)"), ALMONDS("Marcona almonds")],
    },
  },
  {
    id: "greek",
    label: "Greek",
    region: "Europe",
    foods: {
      protein: [CHICKEN("Chicken breast (kotopoulo)"), WHITE_FISH("Sea bream or sea bass"), SQUID("Octopus or squid"), LAMB()],
      grains: [f("Gigantes (giant white beans)", "½ cup cooked", 120, 8.6, 21.6, 0.3), LENTILS("Lentils (fakes)"), f("Bulgur", "½ cup cooked", 76, 2.8, 17, 0.2), f("Whole-wheat pita", "½ small", 85, 3, 17, 0.8)],
      produce: [TOMATO(), CUCUMBER(), f("Horta (wild greens), boiled", "2 cups", 50, 4.4, 9.4, 0.6), EGGPLANT("Eggplant (melitzana)")],
      dairy: [GREEK_YOGURT("Strained Greek yogurt, 2%"), MILK()],
      fats: [OLIVE_OIL("Extra-virgin olive oil"), OLIVES("Kalamata olives"), WALNUTS()],
    },
  },
  {
    id: "british",
    label: "British & Irish",
    region: "Europe",
    foods: {
      protein: [WHITE_FISH("Cod or haddock, baked"), CHICKEN(), BEEF("Lean beef, like topside"), f("Smoked salmon, lean (lox)", "3 oz", 99, 15.5, 0, 3.7)],
      grains: [OATS("Porridge oats"), POTATO("Potatoes, boiled"), f("Wholemeal bread", "1 slice", 80, 4, 14, 1), f("Baked beans, reduced sugar", "½ cup", 105, 6, 19, 0.5)],
      produce: [f("Peas", "½ cup", 62, 4.1, 11.4, 0.2), CABBAGE(), APPLE("Apple slices"), f("Swede or parsnip", "¾ cup cooked", 55, 1, 13, 0.2)],
      dairy: [MILK("Semi-skimmed milk"), YOGURT("Natural yogurt, low-fat"), COTTAGE()],
      fats: [WALNUTS(), f("Rapeseed oil", "1 tsp", 40, 0, 0, 4.5), f("Butter", "1 tsp", 34, 0, 0, 3.8)],
    },
  },
  {
    id: "german",
    label: "German & Central European",
    region: "Europe",
    foods: {
      protein: [PORK("Pork tenderloin (Schweinefilet)"), CHICKEN(), WHITE_FISH("Pollock or trout")],
      grains: [f("Rye bread (Roggenbrot)", "1 slice", 83, 2.7, 15.5, 1.1), POTATO("Potatoes (Kartoffeln)"), f("Spätzle", "⅓ cup cooked", 90, 3.2, 16.5, 1.2), LENTILS("Lentils (Linsen)")],
      produce: [f("Sauerkraut", "1½ cups", 40, 1.9, 9, 0.3), CABBAGE("Red cabbage (Rotkohl)"), APPLE("Apple slices"), CARROTS()],
      dairy: [f("Quark, low-fat (about 2%)", "½ cup", 100, 14, 5, 2.5), KEFIR(), MILK()],
      fats: [WALNUTS(), f("Rapeseed oil", "1 tsp", 40, 0, 0, 4.5), SEEDS("Sunflower seeds")],
    },
  },
  {
    id: "eastern_european",
    label: "Eastern European",
    region: "Europe",
    note: "Polish, Ukrainian, Russian, Romanian",
    foods: {
      protein: [CHICKEN(), WHITE_FISH("Pike or cod fillet, baked"), PORK(), f("Turkey breast", "3 oz cooked", 125, 25, 0, 2)],
      grains: [f("Buckwheat (kasha)", "½ cup cooked", 77, 2.8, 16.8, 0.5), POTATO(), f("Rye bread", "1 slice", 83, 2.7, 15.5, 1.1), f("Barley (perlovka)", "½ cup cooked", 97, 1.8, 22, 0.4)],
      produce: [f("Beets", "¾ cup cooked", 56, 2.2, 12.7, 0.2), CABBAGE(), f("Pickles and pickled cabbage", "1½ cups", 40, 1.9, 9, 0.3), f("Sour cherries or plums", "1 cup", 55, 1, 13, 0.3)],
      dairy: [KEFIR(), f("Farmer's cheese (tvorog), low-fat", "½ cup", 90, 14, 4, 2), YOGURT(), MILK()],
      fats: [SEEDS("Sunflower seeds"), WALNUTS(), f("Sunflower oil", "1 tsp", 40, 0, 0, 4.5)],
    },
  },
  {
    id: "nordic",
    label: "Nordic & Scandinavian",
    region: "Europe",
    foods: {
      protein: [WHITE_FISH("Cod or pollock"), SHRIMP("Cold-water shrimp"), f("Smoked salmon (gravlax-style), lean", "3 oz", 99, 15.5, 0, 3.7), CHICKEN()],
      grains: [f("Rye crispbread", "2 slices", 74, 2, 16, 0.4), POTATO("New potatoes"), OATS(), f("Barley", "½ cup cooked", 97, 1.8, 22, 0.4)],
      produce: [f("Lingonberries or blueberries", "½ cup", 42, 0.5, 10.7, 0.2), f("Root vegetables (beets, carrots)", "1 cup cooked", 60, 1.6, 14, 0.2), CABBAGE()],
      dairy: [f("Skyr, plain 2%", "¾ cup", 110, 16, 6, 2.5), MILK(), KEFIR("Filmjölk (cultured milk), low-fat")],
      fats: [f("Rapeseed oil", "1 tsp", 40, 0, 0, 4.5), WALNUTS(), SEEDS("Sunflower or flax seeds")],
    },
  },

  // ---------- Middle East & North Africa ----------
  {
    id: "lebanese",
    label: "Lebanese & Levantine",
    region: "Middle East & North Africa",
    note: "Lebanese, Syrian, Palestinian, Jordanian",
    foods: {
      protein: [CHICKEN("Chicken breast (shish taouk cut)"), LAMB(), WHITE_FISH("White fish (samak)"), BEEF("Lean beef (kafta, lean mince)")],
      grains: [CHICKPEAS("Chickpeas (hummus base)"), f("Bulgur (for tabbouleh)", "½ cup cooked", 76, 2.8, 17, 0.2), f("Fava beans (foul)", "½ cup cooked", 94, 6.5, 16.7, 0.3), f("Whole-wheat pita", "½ small", 85, 3, 17, 0.8)],
      produce: [f("Parsley, tomato and cucumber", "1½ cups", 40, 2, 8.5, 0.4), EGGPLANT("Eggplant (for baba ghanoush)"), f("Pomegranate seeds", "⅓ cup", 48, 1, 10.8, 0.7), CUCUMBER()],
      dairy: [YOGURT("Laban (plain yogurt), low-fat"), GREEK_YOGURT("Strained yogurt, 2%")],
      fats: [TAHINI(), OLIVE_OIL(), PISTACHIOS(), OLIVES()],
    },
  },
  {
    id: "turkish",
    label: "Turkish",
    region: "Middle East & North Africa",
    foods: {
      protein: [CHICKEN("Chicken breast (tavuk)"), LAMB(), WHITE_FISH("Sea bass (levrek)")],
      grains: [f("Bulgur pilaf base", "½ cup cooked", 76, 2.8, 17, 0.2), f("Red lentils (kırmızı mercimek)", "½ cup cooked", 115, 9, 20, 0.4), CHICKPEAS("Chickpeas (nohut)"), f("Simit, plain, small piece", "1 oz", 80, 2.6, 15, 1)],
      produce: [EGGPLANT("Eggplant (patlıcan)"), PEPPERS("Green peppers (biber)"), TOMATO(), f("Dried apricots", "4 halves", 34, 0.5, 8.8, 0.1)],
      dairy: [YOGURT("Yogurt (yoğurt), low-fat"), MILK()],
      fats: [OLIVE_OIL("Olive oil (zeytinyağı)"), PISTACHIOS("Pistachios (fıstık)"), WALNUTS("Walnuts (ceviz)")],
    },
  },
  {
    id: "persian",
    label: "Persian (Iranian)",
    region: "Middle East & North Africa",
    foods: {
      protein: [CHICKEN("Chicken breast (joojeh cut)"), LAMB(), WHITE_FISH("White fish (mahi)")],
      grains: [RICE_WHITE("Basmati rice (berenj)"), f("Split peas (lapeh)", "½ cup cooked", 116, 8.2, 20.7, 0.4), f("Kidney beans (lubia)", "½ cup cooked", 112, 7.7, 20.2, 0.4), f("Barbari or lavash bread", "1 oz", 78, 2.5, 15.5, 0.6)],
      produce: [f("Radishes and cucumber with fresh herbs (sabzi)", "2 cups", 40, 1.6, 8.6, 0.3), f("Pomegranate seeds", "⅓ cup", 48, 1, 10.8, 0.7), EGGPLANT(), CUCUMBER()],
      dairy: [YOGURT("Mast (yogurt), low-fat"), f("Doogh, plain", "1½ cups", 110, 8, 12, 3)],
      fats: [PISTACHIOS(), WALNUTS(), OLIVE_OIL()],
    },
  },
  {
    id: "north_african",
    label: "North African",
    region: "Middle East & North Africa",
    note: "Moroccan, Algerian, Tunisian, Egyptian",
    foods: {
      protein: [CHICKEN(), LAMB(), WHITE_FISH("Sardines or white fish, grilled"), f("Merguez-style lean lamb mince", "2½ oz cooked", 140, 20, 0, 6)],
      grains: [f("Whole-wheat couscous", "½ cup cooked", 88, 3, 18.5, 0.2), CHICKPEAS(), f("Fava beans (ful medames)", "½ cup cooked", 94, 6.5, 16.7, 0.3), LENTILS()],
      produce: [CARROTS(), TOMATO(), f("Dates", "2 small (deglet noor)", 40, 0.4, 10.6, 0.1), f("Zucchini and turnips", "2 cups cooked", 55, 2.5, 12, 0.3)],
      dairy: [YOGURT("Raib (yogurt), low-fat"), MILK()],
      fats: [OLIVE_OIL(), ALMONDS(), OLIVES(), f("Argan oil", "1 tsp", 40, 0, 0, 4.5)],
    },
  },
  {
    id: "israeli",
    label: "Israeli & Jewish",
    region: "Middle East & North Africa",
    foods: {
      protein: [CHICKEN(), WHITE_FISH("Tilapia (St. Peter's fish)"), EGG_WHITE(), TUNA()],
      grains: [CHICKPEAS(), f("Whole-wheat pita", "½ small", 85, 3, 17, 0.8), f("Buckwheat or barley", "½ cup cooked", 87, 2.3, 19, 0.5), f("Matzah, whole-wheat", "½ sheet", 70, 2.6, 15.6, 0.4)],
      produce: [TOMATO(), CUCUMBER(), PEPPERS(), f("Citrus", "1 medium", 62, 1.2, 15.4, 0.2)],
      dairy: [f("Cottage cheese (gvina), 3%", "½ cup", 100, 12, 4, 3), GREEK_YOGURT("Labaneh-style strained yogurt, 2%"), MILK()],
      fats: [TAHINI(), OLIVE_OIL(), AVOCADO()],
    },
  },

  // ---------- Sub-Saharan Africa ----------
  {
    id: "ghanaian",
    label: "Ghanaian",
    region: "Sub-Saharan Africa",
    foods: {
      protein: [WHITE_FISH("Tilapia, grilled"), CHICKEN("Chicken breast, grilled"), GOAT(), f("Smoked fish (koobi / momoni), small piece", "2 oz", 105, 20, 0, 2.6)],
      grains: [f("Black-eyed peas (red-red base)", "½ cup cooked", 100, 6.6, 18, 0.5), f("Kenkey or banku (fermented corn), small portion", "2 oz", 100, 2, 21, 0.7), f("Yam, boiled", "½ cup", 79, 1, 18.7, 0.1), f("Plantain, boiled (ampesi)", "½ cup", 89, 0.8, 24, 0.1)],
      produce: [f("Kontomire (cocoyam leaves)", "2 cups cooked", 50, 4, 9.8, 0.6), GREENS("Garden egg (African eggplant) and greens"), OKRA(), PINEAPPLE()],
      dairy: [MILK(), YOGURT()],
      fats: [PEANUTS("Groundnuts (peanuts)"), f("Palm oil", "1 tsp", 40, 0, 0, 4.5), MELON_SEEDS("Agushi (melon seeds)")],
    },
  },
  {
    id: "nigerian",
    label: "Nigerian",
    region: "Sub-Saharan Africa",
    foods: {
      protein: [CHICKEN(), GOAT(), WHITE_FISH("Catfish or croaker"), f("Stockfish, rehydrated", "2 oz", 100, 22, 0, 0.8)],
      grains: [f("Brown beans (ewa)", "½ cup cooked", 112, 7.7, 20.2, 0.4), f("Yam, boiled", "½ cup", 79, 1, 18.7, 0.1), f("Plantain, boiled", "½ cup", 89, 0.8, 24, 0.1), f("Garri (cassava), soaked", "2 tbsp dry", 95, 0.5, 23, 0.1)],
      produce: [GREENS("Ugu (pumpkin leaves) or efo (spinach)"), OKRA(), TOMATO("Tomatoes and peppers (ata)"), f("Garden egg", "2 small", 40, 1.6, 9.4, 0.3)],
      dairy: [MILK(), YOGURT()],
      fats: [PEANUTS("Groundnuts"), f("Palm oil", "1 tsp", 40, 0, 0, 4.5), MELON_SEEDS("Egusi (melon seeds)")],
    },
  },
  {
    id: "senegalese",
    label: "West African (Senegalese & Sahel)",
    region: "Sub-Saharan Africa",
    note: "Senegalese, Malian, Ivorian, Guinean",
    foods: {
      protein: [WHITE_FISH("Thiof (grouper) or white fish"), CHICKEN("Chicken (for yassa)"), LAMB("Lamb or mutton, lean")],
      grains: [f("Millet (thiéré)", "½ cup cooked", 104, 3, 20.6, 0.9), RICE_WHITE("Broken rice"), f("Fonio", "½ cup cooked", 100, 2, 22, 0.3), f("Cowpeas (niébé)", "½ cup cooked", 100, 6.6, 18, 0.5)],
      produce: [f("Onions (for yassa)", "1 cup cooked", 60, 1.9, 14, 0.3), OKRA(), CABBAGE(), MANGO()],
      dairy: [YOGURT("Sow (fermented milk), low-fat"), MILK()],
      fats: [PEANUTS("Peanuts (arachides)"), f("Peanut oil", "1 tsp", 40, 0, 0, 4.5), f("Shea or palm oil", "1 tsp", 40, 0, 0, 4.5)],
    },
  },
  {
    id: "ethiopian",
    label: "Ethiopian & Eritrean",
    region: "Sub-Saharan Africa",
    foods: {
      protein: [CHICKEN("Chicken (doro), skinless"), BEEF("Lean beef (tibs cut)"), LAMB()],
      grains: [f("Injera (teff)", "¼ large round", 90, 3.2, 18, 0.7), f("Red lentils (misir)", "½ cup cooked", 115, 9, 20, 0.4), f("Split peas (kik)", "½ cup cooked", 116, 8.2, 20.7, 0.4), f("Chickpea flour (shiro), cooked", "½ cup", 110, 6, 18, 1.5)],
      produce: [GREENS("Gomen (collard greens)"), CABBAGE("Cabbage and carrots (atkilt)"), TOMATO()],
      dairy: [f("Ayib (fresh cheese), low-fat", "⅓ cup", 90, 12, 3, 2.8), YOGURT("Ergo (yogurt), low-fat")],
      fats: [f("Niter kibbeh (spiced butter)", "1 tsp", 40, 0, 0, 4.5), SEEDS("Flaxseed (telba)"), SESAME_OIL("Sesame or sunflower oil")],
    },
  },
  {
    id: "east_african",
    label: "East African",
    region: "Sub-Saharan Africa",
    note: "Kenyan, Tanzanian, Ugandan, Somali",
    foods: {
      protein: [WHITE_FISH("Tilapia (tilapia / samaki)"), GOAT(), CHICKEN(), BEEF("Lean beef (nyama)")],
      grains: [f("Ugali (maize meal)", "⅓ cup cooked", 90, 2, 19, 0.6), f("Beans (maharagwe)", "½ cup cooked", 112, 7.7, 20.2, 0.4), f("Matoke (green bananas), boiled", "1 small", 100, 1.2, 25, 0.3), f("Githeri (maize and beans)", "½ cup", 110, 5, 21, 0.8)],
      produce: [GREENS("Sukuma wiki (collards)"), GREENS("Managu (African nightshade)"), MANGO(), f("Passion fruit", "3 fruits", 52, 1.2, 12.6, 0.4)],
      dairy: [MILK(), f("Mala (fermented milk), low-fat", "1 cup", 104, 9.2, 11.7, 2.3)],
      fats: [PEANUTS("Groundnuts (karanga)"), AVOCADO(), f("Coconut, grated", "1½ tbsp", 52, 0.5, 2.2, 5)],
    },
  },
  {
    id: "southern_african",
    label: "Southern African",
    region: "Sub-Saharan Africa",
    note: "South African, Zimbabwean, Zambian",
    foods: {
      protein: [CHICKEN(), BEEF("Lean beef"), WHITE_FISH("Hake or snoek"), f("Biltong, lean", "1½ oz", 120, 22.5, 1.5, 2.3)],
      grains: [f("Pap (maize porridge)", "⅓ cup cooked", 90, 2, 19, 0.6), f("Samp and beans", "½ cup", 110, 5, 21, 0.8), SWEET_POTATO(), f("Sugar beans", "½ cup cooked", 112, 7.7, 20.2, 0.4)],
      produce: [GREENS("Morogo (wild spinach)"), f("Butternut squash", "¾ cup cooked", 62, 1.4, 16, 0.1), CABBAGE(), ORANGE()],
      dairy: [f("Maas (amasi), low-fat", "1 cup", 104, 9.2, 11.7, 2.3), MILK()],
      fats: [PEANUTS(), AVOCADO(), f("Sunflower oil", "1 tsp", 40, 0, 0, 4.5)],
    },
  },

  // ---------- South Asia ----------
  {
    id: "indian",
    label: "Indian (North)",
    region: "South Asia",
    foods: {
      protein: [CHICKEN("Chicken breast (tandoori cut)"), WHITE_FISH("White fish (machli)"), GOAT("Goat (mutton), lean"), EGG_WHITE()],
      grains: [f("Masoor or moong dal", "½ cup cooked", 115, 9, 20, 0.4), f("Rajma (kidney beans)", "½ cup cooked", 112, 7.7, 20.2, 0.4), f("Chana (chickpeas)", "½ cup cooked", 134, 7.3, 22.5, 2.1), f("Whole-wheat roti", "1 small", 90, 3, 18, 0.8), RICE_WHITE("Basmati rice")],
      produce: [f("Bhindi (okra)", "1½ cups cooked", 53, 2.8, 10.8, 0.3), GREENS("Palak (spinach) or methi"), f("Cauliflower and peas (gobi matar)", "1 cup cooked", 60, 3.5, 11, 0.5), MANGO("Mango (aam)"), GUAVA("Guava (amrood)")],
      dairy: [YOGURT("Dahi (yogurt), low-fat"), f("Chaas or plain lassi, low-fat", "1½ cups", 105, 8, 12, 2.6), MILK()],
      fats: [GHEE(), ALMONDS("Almonds (badam)"), f("Mustard oil", "1 tsp", 40, 0, 0, 4.5)],
    },
  },
  {
    id: "south_indian",
    label: "South Indian & Sri Lankan",
    region: "South Asia",
    foods: {
      protein: [WHITE_FISH("Seer fish or pomfret"), SHRIMP("Prawns"), CHICKEN(), EGG_WHITE()],
      grains: [f("Toor dal (sambar base)", "½ cup cooked", 115, 7, 21, 0.4), f("Idli", "2 small", 90, 2.8, 19, 0.3), RICE_WHITE("Rice (ponni or red rice)"), f("Ragi (finger millet), cooked", "½ cup", 100, 2.5, 21, 0.6)],
      produce: [f("Drumstick (moringa) and gourds", "1½ cups cooked", 50, 2.8, 11, 0.3), GREENS("Amaranth greens (keerai)"), PAPAYA(), BANANA()],
      dairy: [YOGURT("Curd (thayir), low-fat"), f("Buttermilk (moru)", "1½ cups", 105, 8, 12, 2.6)],
      fats: [COCONUT_MILK(), f("Coconut, grated", "1½ tbsp", 52, 0.5, 2.2, 5), SESAME_OIL("Sesame (gingelly) oil")],
    },
  },
  {
    id: "pakistani",
    label: "Pakistani & Bangladeshi",
    region: "South Asia",
    foods: {
      protein: [CHICKEN(), GOAT("Goat or mutton, lean"), WHITE_FISH("Rohu or hilsa-style white fish, baked"), BEEF("Lean beef")],
      grains: [f("Chana dal", "½ cup cooked", 120, 7, 21, 0.5), f("Whole-wheat chapati", "1 small", 90, 3, 18, 0.8), RICE_WHITE("Basmati rice"), LENTILS("Masoor dal")],
      produce: [GREENS("Saag (mustard greens)"), f("Bitter gourd (karela)", "2 cups cooked", 50, 2, 10, 0.4), OKRA("Bhindi (okra)"), MANGO()],
      dairy: [YOGURT("Dahi, low-fat"), f("Lassi, plain low-fat", "1½ cups", 105, 8, 12, 2.6), MILK()],
      fats: [GHEE(), ALMONDS(), PISTACHIOS()],
    },
  },

  // ---------- East Asia ----------
  {
    id: "chinese",
    label: "Chinese",
    region: "East Asia",
    foods: {
      protein: [CHICKEN(), SHRIMP("Shrimp (xia)"), WHITE_FISH("Steamed white fish"), PORK("Lean pork (shou rou)")],
      grains: [RICE_WHITE("Jasmine rice"), NOODLES("Rice or glass noodles"), f("Steamed bun (mantou), small", "½ bun", 110, 3.5, 22, 0.6), f("Adzuki (red) beans", "⅓ cup cooked", 98, 5.7, 19, 0.1)],
      produce: [f("Gai lan (Chinese broccoli)", "2½ cups cooked", 55, 3, 10, 1), f("Lotus root", "½ cup cooked slices", 54, 1.3, 12.8, 0.1), f("Snow peas", "1½ cups", 63, 4.2, 11.3, 0.3), EGGPLANT("Chinese eggplant"), f("Lychee or mandarin", "½ cup / 1 large", 55, 0.8, 13.5, 0.3)],
      dairy: [MILK(), YOGURT()],
      fats: [SESAME_OIL(), PEANUTS(), VEG_OIL("Peanut or vegetable oil")],
    },
  },
  {
    id: "japanese",
    label: "Japanese",
    region: "East Asia",
    foods: {
      protein: [TUNA("Tuna (maguro), lean"), WHITE_FISH("Cod (tara) or sea bream"), CHICKEN("Chicken breast (tori)"), SHRIMP("Shrimp (ebi)")],
      grains: [RICE_WHITE("Short-grain rice (gohan)"), f("Soba (buckwheat noodles)", "¾ cup cooked", 85, 4.3, 18.3, 0.1), f("Udon noodles", "½ cup cooked", 100, 2.6, 21, 0.4), f("Japanese sweet potato (satsumaimo)", "½ medium", 100, 1, 24, 0.1)],
      produce: [f("Daikon", "2 cups cooked", 34, 1.2, 8, 0.2), f("Seaweed (wakame) and cucumber", "1½ cups", 40, 2, 8.5, 0.4), GREENS("Spinach (horenso), boiled"), f("Nashi pear", "1 small", 51, 0.6, 13, 0.3)],
      dairy: [YOGURT(), MILK()],
      fats: [SESAME_OIL(), SEEDS("Sesame seeds (goma)"), AVOCADO()],
    },
  },
  {
    id: "korean",
    label: "Korean",
    region: "East Asia",
    foods: {
      protein: [CHICKEN(), BEEF("Lean beef (bulgogi cut)"), WHITE_FISH("Pollock (myeongtae) or mackerel, grilled"), SQUID("Squid (ojingeo)")],
      grains: [f("Multigrain rice (japgokbap)", "⅓ cup cooked", 75, 1.8, 15.8, 0.4), f("Sweet potato (goguma)", "½ medium", 100, 1, 24, 0.1), f("Buckwheat noodles (naengmyeon)", "¾ cup cooked", 85, 4.3, 18.3, 0.1)],
      produce: [f("Korean radish (mu)", "2 cups cooked", 34, 1.2, 8, 0.2), f("Korean zucchini (aehobak)", "2 cups cooked", 54, 4.1, 9.7, 0.4), f("Spinach (sigeumchi namul)", "2 cups cooked", 50, 4.4, 9.4, 0.6), f("Korean pear (bae)", "½", 60, 0.5, 15, 0.2)],
      dairy: [MILK(), YOGURT()],
      fats: [SESAME_OIL(), SEEDS("Sesame seeds"), f("Pine nuts (jat)", "1½ tsp", 42, 0.8, 0.8, 4.3)],
    },
  },

  // ---------- Southeast Asia & Pacific ----------
  {
    id: "thai",
    label: "Thai",
    region: "Southeast Asia & Pacific",
    foods: {
      protein: [CHICKEN("Chicken breast (gai)"), SHRIMP("Shrimp (goong)"), WHITE_FISH("White fish (pla), steamed"), SQUID("Squid (pla muek)")],
      grains: [RICE_WHITE("Jasmine rice (khao hom mali)"), f("Sticky rice (khao niao)", "½ cup cooked", 120, 2.5, 26, 0.2), NOODLES("Rice noodles (sen lek)"), f("Mung beans", "½ cup cooked", 106, 7, 19, 0.4)],
      produce: [f("Green papaya (som tam base)", "1½ cups", 58, 0.9, 14.6, 0.2), f("Thai eggplant and long beans", "1½ cups cooked", 50, 2.5, 11, 0.3), MANGO("Mango (mamuang)"), PINEAPPLE()],
      dairy: [MILK(), YOGURT()],
      fats: [COCONUT_MILK("Coconut milk (gati)"), PEANUTS(), VEG_OIL()],
    },
  },
  {
    id: "vietnamese",
    label: "Vietnamese",
    region: "Southeast Asia & Pacific",
    foods: {
      protein: [CHICKEN("Chicken (gà)"), SHRIMP("Shrimp (tôm)"), WHITE_FISH("Catfish (cá basa)"), BEEF("Lean beef (bò), for phở")],
      grains: [NOODLES("Rice noodles (bánh phở / bún)"), RICE_WHITE("Rice (cơm)"), f("Rice paper", "3 sheets", 99, 1.8, 22.5, 0.2)],
      produce: [f("Fresh herbs, lettuce and bean sprouts", "3 cups", 52, 3.7, 9.8, 0.4), f("Pomelo (bưởi)", "¾ cup", 54, 1.1, 13.7, 0.1), f("Dragon fruit", "1 cup", 60, 1.2, 13, 0.4), PAPAYA()],
      dairy: [MILK(), YOGURT("Sữa chua, plain low-fat")],
      fats: [PEANUTS(), COCONUT_MILK(), VEG_OIL()],
    },
  },
  {
    id: "filipino",
    label: "Filipino",
    region: "Southeast Asia & Pacific",
    foods: {
      protein: [WHITE_FISH("Bangus (milkfish), baked"), CHICKEN("Chicken (for adobo or tinola)"), SHRIMP("Hipon (shrimp)"), SQUID("Pusit (squid)")],
      grains: [RICE_WHITE("Rice (kanin)"), f("Ube (purple yam), boiled", "½ cup", 79, 1, 18.7, 0.1), f("Mung beans (munggo)", "½ cup cooked", 106, 7, 19, 0.4), f("Saba banana, boiled", "1 small", 100, 1.2, 25, 0.3)],
      produce: [LONG_BEANS("Sitaw (long beans) and squash"), f("Ampalaya (bitter melon)", "2 cups cooked", 50, 2, 10, 0.4), MANGO("Mango (mangga)"), f("Calamansi and papaya", "1 cup", 55, 0.9, 13.7, 0.4)],
      dairy: [MILK(), YOGURT()],
      fats: [COCONUT_MILK("Coconut milk (gata)"), PEANUTS("Mani (peanuts)"), VEG_OIL()],
    },
  },
  {
    id: "indonesian",
    label: "Indonesian & Malaysian",
    region: "Southeast Asia & Pacific",
    foods: {
      protein: [CHICKEN("Chicken (ayam), for satay"), WHITE_FISH("White fish (ikan), grilled"), SHRIMP("Udang (shrimp)"), f("Squid (cumi-cumi)", "4 oz cooked", 119, 20, 4, 1.7)],
      grains: [RICE_WHITE("Rice (nasi)"), NOODLES("Rice vermicelli (bihun)"), f("Cassava (singkong), boiled", "⅓ cup", 109, 0.9, 26, 0.2), f("Corn (jagung)", "½ cup", 90, 3, 19, 1.2)],
      produce: [LONG_BEANS("Mixed vegetables (sayur asem)"), f("Long beans and cabbage (gado-gado base)", "1½ cups", 50, 2.6, 10.5, 0.3), PAPAYA(), PINEAPPLE("Pineapple (nanas)")],
      dairy: [MILK(), YOGURT()],
      fats: [PEANUTS("Peanuts (kacang)"), COCONUT_MILK("Coconut milk (santan)"), VEG_OIL("Palm or vegetable oil")],
    },
  },
  {
    id: "pacific",
    label: "Hawaiian & Pacific Islander",
    region: "Southeast Asia & Pacific",
    note: "Hawaiian, Samoan, Tongan, Fijian, Māori",
    foods: {
      protein: [TUNA("Ahi tuna (poke cut)"), WHITE_FISH("Mahi-mahi or snapper"), CHICKEN(), PORK("Lean pork (kalua cut, trimmed)")],
      grains: [f("Taro (kalo), boiled", "½ cup", 94, 0.4, 23, 0.1), f("Poi", "⅓ cup", 90, 0.3, 21.7, 0.1), f("Breadfruit (ulu), boiled", "⅓ cup", 76, 0.8, 20, 0.2), SWEET_POTATO("Sweet potato (ʻuala / kumara)")],
      produce: [BANANA(), PAPAYA(), PINEAPPLE(), f("Seaweed (limu) and cucumber", "1½ cups", 40, 2, 8.5, 0.4)],
      dairy: [MILK(), YOGURT()],
      fats: [COCONUT_MILK(), f("Macadamia nuts", "3 nuts", 60, 0.7, 1.1, 6.4), AVOCADO()],
    },
  },
];

export const cuisineById = (id: string) => CUISINES.find((c) => c.id === id);

export type CuisineFood = Food & { match: number };

/** A cuisine's ingredients in one food group that match the group's typical serving at least 80%. */
export function cuisineExamples(cuisineId: string, group: FoodGroupId): CuisineFood[] {
  const c = cuisineById(cuisineId);
  const g = FOOD_GROUPS.find((x) => x.id === group);
  if (!c || !g) return [];
  return (c.foods[group] ?? [])
    .map((food) => ({ ...food, match: similarity(food, g.typical) }))
    .filter((x) => x.match >= MIN_MATCH)
    .sort((a, b) => b.match - a.match);
}

/** Every cuisine with its passing ingredients, grouped by region (for pickers and the mobile app). */
export function cuisineCatalog() {
  return CUISINES.map((c) => ({
    id: c.id,
    label: c.label,
    region: c.region,
    note: c.note ?? null,
    groups: FOOD_GROUPS.map((g) => ({ id: g.id, foods: cuisineExamples(c.id, g.id) })),
  }));
}

/** Find an ingredient by name in any cuisine (for clinician suggestions saved by name). */
export function findCuisineFood(group: FoodGroupId, name: string) {
  for (const c of CUISINES) {
    const hit = c.foods[group]?.find((x) => x.name === name);
    if (hit) return { ...hit, cuisine: c.label };
  }
  return null;
}
