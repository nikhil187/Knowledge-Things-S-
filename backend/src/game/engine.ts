import type {
  Difficulty,
  GameRoom,
  GameMode,
  Grade,
  MathProblem,
  Player,
  PowerUpState,
  PowerUpType,
  Subject,
  Topic,
} from "../types";
import type { OpenAIQuestion } from "../services/openaiService";

const DEFAULT_QUESTIONS = 10;
const TEAM_POINTS_PER_QUESTION = 10;
const TEAM_CORRECT_THRESHOLD = 0.75;

const TEAM_STREAK_BONUS = [0, 0, 20, 30, 50, 50, 50, 50, 50, 50, 50]; // index = streak length
const TEAM_ALL_CORRECT_BONUS = 25;
const TEAM_SPEED_BONUS_THRESHOLD_MS = 15000; // all answer within 15s
const TEAM_SPEED_BONUS = 15;

// ─── Power-Up Helpers ───────────────────────────────────────────────────────
function defaultPowerUps(): PowerUpState {
  return {
    team_shield: { available: false, used: false },
    time_boost: { available: false, used: false },
    bonus_round: { available: true, used: false }, // 1 free per game
  };
}

// ─── Local Math Fallback ────────────────────────────────────────────────────

const WORD_PROBLEMS: Record<Difficulty, string[]> = {
  1: [
    "Tom has 24 apples. He gives 7 to his friend. How many does Tom have left?",
    "There are 15 birds on a tree. 8 fly away. How many birds remain?",
    "Sara has 18 stickers. She gets 9 more. How many stickers does Sara have?",
  ],
  2: [
    "A store has 156 books. They sell 48. How many books are left?",
    "A farmer has 234 sheep. He buys 67 more. How many sheep in total?",
    "There are 189 students. 94 go on a trip. How many stay at school?",
  ],
  3: [
    "Each box has 6 pencils. There are 8 boxes. How many pencils total?",
    "A pack has 4 toys. The store has 9 packs. How many toys?",
    "There are 7 rows of 5 chairs. How many chairs?",
  ],
  4: [
    "24 apples are shared equally among 6 children. How many per child?",
    "35 candies are put into 5 bags. How many in each bag?",
    "48 students form 8 equal teams. How many per team?",
  ],
  5: [
    "Jake buys 3 pens at $4 each and 2 notebooks at $5 each. What is the total cost?",
    "A train travels 60 km in 1 hour. How far does it go in 3 hours?",
    "There are 5 shelves with 12 books each. 8 books are removed. How many remain?",
  ],
};

type Q = OpenAIQuestion;
const FALLBACK_QUESTIONS: Record<string, Q[]> = {
  "Science:Animals & Habitats": [
    { question: "What is the natural home of an animal called?", options: ["A den", "A habitat", "A biome", "A territory"], answer: "B" },
    { question: "Which animal lives in the Arctic tundra?", options: ["Camel", "Polar bear", "Lion", "Elephant"], answer: "B" },
    { question: "What do we call animals that only eat plants?", options: ["Carnivores", "Omnivores", "Herbivores", "Decomposers"], answer: "C" },
    { question: "Which habitat has the most species of plants and animals?", options: ["Desert", "Tundra", "Tropical rainforest", "Grassland"], answer: "C" },
    { question: "What do animals need to survive in their habitat?", options: ["Only food", "Food, water, shelter, and space", "Only shelter", "Only water"], answer: "B" },
    { question: "Which animal is adapted to live in a desert?", options: ["Penguin", "Camel", "Polar bear", "Salmon"], answer: "B" },
    { question: "What is migration in animals?", options: ["Sleeping through winter", "Seasonal movement to find food or warmth", "Changing body color", "Growing thicker fur"], answer: "B" },
    { question: "Which ocean animal uses echolocation to navigate?", options: ["Shark", "Starfish", "Dolphin", "Crab"], answer: "C" },
    { question: "What is a food chain?", options: ["A chain used to trap animals", "A sequence showing who eats whom", "A list of endangered animals", "A group of animals living together"], answer: "B" },
    { question: "Which of these is a predator?", options: ["Rabbit", "Deer", "Wolf", "Cow"], answer: "C" },
  ],
  "Science:Plants & Growth": [
    { question: "What process do plants use to make their own food?", options: ["Respiration", "Transpiration", "Photosynthesis", "Germination"], answer: "C" },
    { question: "Which part of a plant absorbs water and nutrients from the soil?", options: ["Leaves", "Stem", "Roots", "Flowers"], answer: "C" },
    { question: "What gas do plants absorb during photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: "C" },
    { question: "What do seeds need to begin germinating?", options: ["Sunlight only", "Water, warmth, and oxygen", "Soil and fertilizer", "Cold temperature and darkness"], answer: "B" },
    { question: "Which part of the plant produces seeds?", options: ["Roots", "Stem", "Flower", "Leaf"], answer: "C" },
    { question: "What is the green pigment in leaves called?", options: ["Melanin", "Chlorophyll", "Carotene", "Pigmentin"], answer: "B" },
    { question: "What do plants release into the air during photosynthesis?", options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Water vapor only"], answer: "C" },
    { question: "What is the movement of water through a plant called?", options: ["Photosynthesis", "Respiration", "Transpiration", "Germination"], answer: "C" },
    { question: "Which type of plant has no roots, stems, or leaves?", options: ["Fern", "Moss", "Algae", "Cactus"], answer: "C" },
    { question: "What carries water from the roots to the leaves?", options: ["Phloem", "Xylem", "Stomata", "Chloroplasts"], answer: "B" },
  ],
  "Science:Human Body": [
    { question: "Which organ pumps blood through the body?", options: ["Lungs", "Brain", "Heart", "Kidney"], answer: "C" },
    { question: "How many bones are in an adult human body?", options: ["106", "186", "206", "256"], answer: "C" },
    { question: "What do the lungs do?", options: ["Digest food", "Filter blood", "Exchange oxygen and carbon dioxide", "Pump blood"], answer: "C" },
    { question: "Which organ controls everything the body does?", options: ["Heart", "Stomach", "Brain", "Liver"], answer: "C" },
    { question: "What is the job of the small intestine?", options: ["Store waste", "Absorb nutrients from food", "Pump blood", "Filter toxins"], answer: "B" },
    { question: "What do red blood cells carry?", options: ["Food", "Oxygen", "Hormones", "Waste only"], answer: "B" },
    { question: "Which system includes the bones and joints?", options: ["Muscular system", "Nervous system", "Skeletal system", "Digestive system"], answer: "C" },
    { question: "What is the largest organ in the human body?", options: ["Heart", "Brain", "Liver", "Skin"], answer: "D" },
    { question: "What do kidneys filter from the blood?", options: ["Oxygen", "Nutrients", "Waste and excess water", "Carbon dioxide"], answer: "C" },
    { question: "How many chambers does the human heart have?", options: ["2", "3", "4", "6"], answer: "C" },
  ],
  "Science:Earth & Space": [
    { question: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], answer: "C" },
    { question: "What causes day and night on Earth?", options: ["Earth revolving around the Sun", "The Moon blocking sunlight", "Earth rotating on its axis", "Clouds covering the Sun"], answer: "C" },
    { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], answer: "B" },
    { question: "What is the name of Earth's natural satellite?", options: ["Pluto", "Mars", "The Moon", "Jupiter"], answer: "C" },
    { question: "Which is the largest planet in our solar system?", options: ["Saturn", "Neptune", "Earth", "Jupiter"], answer: "D" },
    { question: "What is the layer of gases surrounding Earth called?", options: ["Hydrosphere", "Lithosphere", "Atmosphere", "Biosphere"], answer: "C" },
    { question: "What causes the seasons on Earth?", options: ["Earth's distance from the Sun changing", "Earth's tilted axis as it orbits the Sun", "The Moon's gravity", "Sunspots on the Sun's surface"], answer: "B" },
    { question: "What is a star made of?", options: ["Rock and ice", "Hot gas — mainly hydrogen and helium", "Metal and dust", "Water and oxygen"], answer: "B" },
    { question: "Which planet is known as the Red Planet?", options: ["Jupiter", "Venus", "Saturn", "Mars"], answer: "D" },
    { question: "What is the Milky Way?", options: ["A type of cloud", "The name of our galaxy", "A constellation", "The path of the Moon"], answer: "B" },
  ],
  "Science:Weather & Climate": [
    { question: "What instrument measures air temperature?", options: ["Barometer", "Thermometer", "Anemometer", "Hygrometer"], answer: "B" },
    { question: "What is the water cycle?", options: ["The path water takes from rivers to the sea", "The continuous movement of water through evaporation, condensation, and precipitation", "The amount of water on Earth", "How water is cleaned"], answer: "B" },
    { question: "What type of cloud produces thunderstorms?", options: ["Cumulus", "Stratus", "Cirrus", "Cumulonimbus"], answer: "D" },
    { question: "What is the difference between weather and climate?", options: ["They are the same thing", "Weather is short-term; climate is long-term patterns", "Climate changes daily; weather does not", "Weather is measured in degrees; climate is not"], answer: "B" },
    { question: "What causes wind?", options: ["The Earth spinning", "Differences in air pressure", "The Moon's gravity", "Ocean currents"], answer: "B" },
    { question: "What is precipitation?", options: ["Water vapor in the air", "Any form of water falling from clouds", "The process of evaporation", "Hot air rising"], answer: "B" },
    { question: "Which layer of the atmosphere is closest to Earth's surface?", options: ["Stratosphere", "Mesosphere", "Troposphere", "Thermosphere"], answer: "C" },
    { question: "What causes a rainbow to form?", options: ["Light passing through water droplets and bending", "Sunlight reflecting off clouds", "Ice crystals in the sky", "Pollution in the air"], answer: "A" },
    { question: "What is humidity?", options: ["Amount of rain that has fallen", "Amount of water vapor in the air", "Wind speed", "Air pressure level"], answer: "B" },
    { question: "Which gas contributes most to the greenhouse effect?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: "C" },
  ],
  "Science:Matter & Energy": [
    { question: "What are the three states of matter?", options: ["Hot, warm, and cold", "Solid, liquid, and gas", "Heavy, medium, and light", "Hard, soft, and fluid"], answer: "B" },
    { question: "What happens to most solids when they are heated?", options: ["They shrink", "They expand", "They turn into a gas immediately", "They stay the same"], answer: "B" },
    { question: "What is the change from liquid to gas called?", options: ["Melting", "Freezing", "Evaporation", "Condensation"], answer: "C" },
    { question: "Which of these is a good conductor of heat?", options: ["Wood", "Rubber", "Plastic", "Metal"], answer: "D" },
    { question: "What form of energy does the Sun produce?", options: ["Chemical and kinetic energy", "Light and heat energy", "Nuclear and electrical energy", "Sound and potential energy"], answer: "B" },
    { question: "What is the change from solid to liquid called?", options: ["Evaporation", "Condensation", "Melting", "Freezing"], answer: "C" },
    { question: "Which material is a poor conductor of electricity?", options: ["Copper", "Iron", "Rubber", "Steel"], answer: "C" },
    { question: "What type of energy does a moving object have?", options: ["Potential energy", "Chemical energy", "Kinetic energy", "Nuclear energy"], answer: "C" },
    { question: "What is the boiling point of water at sea level?", options: ["50°C", "75°C", "100°C", "120°C"], answer: "C" },
    { question: "What happens to a gas when it is cooled to become liquid?", options: ["Evaporation", "Condensation", "Sublimation", "Melting"], answer: "B" },
  ],
  "English:Spelling": [
    { question: "Which word is spelled correctly?", options: ["Recieve", "Receive", "Receve", "Receeve"], answer: "B" },
    { question: "How do you spell the plural of 'leaf'?", options: ["Leafs", "Leafes", "Leaves", "Leafs"], answer: "C" },
    { question: "Which word is spelled correctly?", options: ["Beleive", "Believe", "Beleve", "Beleeve"], answer: "B" },
    { question: "What is the correct spelling?", options: ["Freind", "Frend", "Friend", "Frhend"], answer: "C" },
    { question: "How do you spell the past tense of 'write'?", options: ["Writed", "Written", "Wrote", "Writen"], answer: "C" },
    { question: "Which word is spelled correctly?", options: ["Calender", "Calendar", "Calandar", "Calander"], answer: "B" },
    { question: "How do you spell the word meaning 'very surprising'?", options: ["Amazeing", "Amaizing", "Amazing", "Amezing"], answer: "C" },
    { question: "Which word is spelled correctly?", options: ["Necessery", "Necessary", "Necesary", "Nessecary"], answer: "B" },
    { question: "How do you spell the plural of 'potato'?", options: ["Potatos", "Potatoes", "Potatoez", "Potatois"], answer: "B" },
    { question: "Which is the correct spelling?", options: ["Ocassion", "Occassion", "Occasion", "Ocasion"], answer: "C" },
  ],
  "English:Grammar": [
    { question: "Which word is a verb?", options: ["Happy", "Mountain", "Run", "Blue"], answer: "C" },
    { question: "What is the plural of 'child'?", options: ["Childs", "Childes", "Children", "Childrens"], answer: "C" },
    { question: "Which sentence is in the past tense?", options: ["She runs fast.", "She will run fast.", "She ran fast.", "She is running fast."], answer: "C" },
    { question: "What is a noun?", options: ["An action word", "A describing word", "A person, place, or thing", "A connecting word"], answer: "C" },
    { question: "Which word is an adjective in: 'The big dog barked'?", options: ["The", "Big", "Dog", "Barked"], answer: "B" },
    { question: "What punctuation ends a question?", options: ["Full stop", "Comma", "Question mark", "Exclamation mark"], answer: "C" },
    { question: "What is the subject in: 'The cat sat on the mat'?", options: ["Sat", "Mat", "The cat", "On"], answer: "C" },
    { question: "Which word is a pronoun?", options: ["Book", "Run", "She", "Quickly"], answer: "C" },
    { question: "What does an adverb describe?", options: ["A noun", "A verb, adjective, or another adverb", "A pronoun only", "A sentence"], answer: "B" },
    { question: "Which is a compound sentence?", options: ["The dog barked.", "She sang and he danced.", "Running quickly.", "A red apple."], answer: "B" },
  ],
  "English:Vocabulary": [
    { question: "What does 'enormous' mean?", options: ["Very small", "Very fast", "Very large", "Very old"], answer: "C" },
    { question: "Which word is a synonym for 'happy'?", options: ["Sad", "Angry", "Joyful", "Tired"], answer: "C" },
    { question: "What is an antonym?", options: ["A word with a similar meaning", "A word with the opposite meaning", "A type of noun", "A word from another language"], answer: "B" },
    { question: "What does the prefix 'un-' mean?", options: ["Again", "Not or opposite", "Before", "After"], answer: "B" },
    { question: "Which word means 'to make something better'?", options: ["Worsen", "Improve", "Ignore", "Remove"], answer: "B" },
    { question: "What does 'transparent' mean?", options: ["Cannot be seen through", "Can be seen through", "Very shiny", "Very dark"], answer: "B" },
    { question: "What does the suffix '-ful' mean?", options: ["Without", "Full of", "Small", "Again"], answer: "B" },
    { question: "Which word is an antonym of 'ancient'?", options: ["Old", "Modern", "Historical", "Classic"], answer: "B" },
    { question: "What does 'predict' mean?", options: ["To look back", "To say what will happen before it does", "To describe something", "To ask a question"], answer: "B" },
    { question: "Which word means 'very hungry'?", options: ["Thirsty", "Tired", "Starving", "Bored"], answer: "C" },
  ],
  "English:Punctuation": [
    { question: "Which punctuation mark ends a sentence that is a statement?", options: ["Comma", "Question mark", "Full stop", "Exclamation mark"], answer: "C" },
    { question: "Where does a comma go in a list?", options: ["At the end of the list", "Between each item in the list", "Only at the start", "After the last item"], answer: "B" },
    { question: "What does an apostrophe show in 'Tom's book'?", options: ["Plural", "Possession", "Abbreviation", "Question"], answer: "B" },
    { question: "Which sentence uses an exclamation mark correctly?", options: ["I went to the shop!", "What! is your name?", "She? ran fast", "He, went home!"], answer: "A" },
    { question: "What is a speech mark used for?", options: ["To show possession", "To show someone is speaking", "To end a sentence", "To show a list"], answer: "B" },
    { question: "Which word needs a capital letter?", options: ["dog", "tree", "london", "run"], answer: "C" },
    { question: "Where should a comma go: 'After school I went home'?", options: ["After 'I'", "After 'school'", "After 'went'", "No comma needed"], answer: "B" },
    { question: "What does a colon (:) introduce?", options: ["A question", "A list or explanation", "A new paragraph", "A person's name"], answer: "B" },
    { question: "Which is an example of a contraction?", options: ["Cannot", "Can't", "Can not", "Cant"], answer: "B" },
    { question: "What punctuation separates two main clauses that are closely linked?", options: ["Comma", "Apostrophe", "Semicolon", "Hyphen"], answer: "C" },
  ],
  "English:Reading Comprehension": [
    { question: "What does 'main idea' mean in a text?", options: ["The last sentence", "The most important point the text is making", "The title only", "A small detail"], answer: "B" },
    { question: "What is a 'setting' in a story?", options: ["The main character", "When and where the story takes place", "The problem in the story", "How the story ends"], answer: "B" },
    { question: "What is 'inference'?", options: ["Reading a text aloud", "Using clues in the text to figure out something not directly stated", "Summarising a text", "Finding the author's name"], answer: "B" },
    { question: "What is a 'character' in a story?", options: ["The place where a story is set", "The theme of the story", "A person or animal in the story", "The problem in the story"], answer: "C" },
    { question: "What does 'summarise' mean?", options: ["Copy the text word for word", "Give a brief overview of the main points", "Read the text again", "Find all the adjectives"], answer: "B" },
    { question: "What is 'point of view' in a story?", options: ["The setting", "The perspective from which the story is told", "The ending", "The title"], answer: "B" },
    { question: "What does 'context clue' mean?", options: ["A clue about the setting", "Words around an unknown word that help explain its meaning", "The title of the book", "A description of a character"], answer: "B" },
    { question: "What is the 'plot' of a story?", options: ["Where the story takes place", "The sequence of events in a story", "Who wrote the story", "How long the story is"], answer: "B" },
    { question: "What is 'theme' in a story?", options: ["The title", "The main character's name", "The central message or lesson", "The setting"], answer: "C" },
    { question: "What is a 'fact' as opposed to an 'opinion'?", options: ["Something one person believes", "Something that can be proven true", "A guess", "A feeling"], answer: "B" },
  ],
  "English:Parts of Speech": [
    { question: "Which word is a noun?", options: ["Run", "Quick", "Beautiful", "Mountain"], answer: "D" },
    { question: "Which word is a verb?", options: ["Blue", "Slowly", "Sing", "Large"], answer: "C" },
    { question: "Which word is an adjective?", options: ["Quickly", "Sing", "Bright", "Them"], answer: "C" },
    { question: "Which word is an adverb?", options: ["Happy", "Tree", "Quickly", "Eat"], answer: "C" },
    { question: "Which is a pronoun?", options: ["Book", "Run", "She", "Quickly"], answer: "C" },
    { question: "What type of word is 'but' in: 'I wanted to go, but it rained'?", options: ["Noun", "Verb", "Conjunction", "Preposition"], answer: "C" },
    { question: "Which word is a preposition?", options: ["Jump", "Blue", "Under", "Slowly"], answer: "C" },
    { question: "What part of speech is 'wow' in 'Wow! That is amazing!'?", options: ["Noun", "Interjection", "Verb", "Adjective"], answer: "B" },
    { question: "Which word is a proper noun?", options: ["city", "river", "paris", "mountain"], answer: "C" },
    { question: "Which is a possessive pronoun?", options: ["He", "Run", "Mine", "Over"], answer: "C" },
  ],
  "History:Ancient Civilizations": [
    { question: "Which civilization built the pyramids at Giza?", options: ["Roman", "Greek", "Egyptian", "Mesopotamian"], answer: "C" },
    { question: "What was the ancient city of Rome's most famous arena called?", options: ["Parthenon", "Pantheon", "Colosseum", "Forum"], answer: "C" },
    { question: "Which river was essential to ancient Egyptian civilization?", options: ["Amazon", "Nile", "Tigris", "Indus"], answer: "B" },
    { question: "What writing system did ancient Egyptians use?", options: ["Cuneiform", "Alphabet", "Hieroglyphics", "Sanskrit"], answer: "C" },
    { question: "Which ancient civilization built Machu Picchu?", options: ["Aztec", "Maya", "Inca", "Olmec"], answer: "C" },
    { question: "What is the Parthenon?", options: ["An Egyptian tomb", "A Greek temple in Athens", "A Roman palace", "A Chinese fortress"], answer: "B" },
    { question: "Who was the ruler of ancient Egypt called?", options: ["Emperor", "King", "Pharaoh", "Sultan"], answer: "C" },
    { question: "Which ancient civilization invented the wheel?", options: ["Egyptian", "Mesopotamian (Sumerian)", "Greek", "Roman"], answer: "B" },
    { question: "What was the Silk Road?", options: ["A famous road in Rome", "An ancient trade route connecting Asia to Europe", "A type of ancient cloth", "A river in China"], answer: "B" },
    { question: "The ancient Olympics were first held in which country?", options: ["Italy", "Egypt", "Greece", "Turkey"], answer: "C" },
  ],
  "History:World Wars": [
    { question: "In which year did World War I begin?", options: ["1910", "1912", "1914", "1918"], answer: "C" },
    { question: "In which year did World War II end?", options: ["1942", "1944", "1945", "1947"], answer: "C" },
    { question: "Which countries formed the Allied Powers in World War II?", options: ["Germany, Italy, Japan", "USA, UK, France, Soviet Union", "Austria, Hungary, Bulgaria", "Spain, Portugal, Sweden"], answer: "B" },
    { question: "What was the name of the plan by Germany to invade France through Belgium in WWI?", options: ["Operation Barbarossa", "The Schlieffen Plan", "D-Day", "The Marshall Plan"], answer: "B" },
    { question: "Where did D-Day take place in 1944?", options: ["Italy", "Normandy, France", "Poland", "North Africa"], answer: "B" },
    { question: "Who was the leader of Germany during World War II?", options: ["Joseph Stalin", "Benito Mussolini", "Adolf Hitler", "Francisco Franco"], answer: "C" },
    { question: "What caused the United States to enter World War II?", options: ["Germany invading Poland", "The attack on Pearl Harbor", "The fall of France", "The sinking of the Lusitania"], answer: "B" },
    { question: "What was the Holocaust?", options: ["A major battle in WWI", "The Nazi systematic murder of six million Jewish people", "A peace treaty after WWII", "An Allied invasion of Italy"], answer: "B" },
    { question: "Which city was divided by a wall after World War II?", options: ["Paris", "London", "Berlin", "Warsaw"], answer: "C" },
    { question: "What was the name of the first atomic bomb dropped in WWII?", options: ["Trinity", "Little Boy", "Fat Man", "Big Bomb"], answer: "B" },
  ],
  "History:American History": [
    { question: "Who was the first President of the United States?", options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"], answer: "C" },
    { question: "In which year did the Declaration of Independence get signed?", options: ["1774", "1775", "1776", "1783"], answer: "C" },
    { question: "Who wrote the Declaration of Independence?", options: ["George Washington", "Benjamin Franklin", "Thomas Jefferson", "John Adams"], answer: "C" },
    { question: "What war was fought between the Northern and Southern states of America?", options: ["The Revolutionary War", "The Civil War", "World War I", "The War of 1812"], answer: "B" },
    { question: "Which President ended slavery in the United States?", options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "Ulysses Grant"], answer: "C" },
    { question: "What was the name of the movement in which Rosa Parks refused to give up her bus seat?", options: ["The Suffrage Movement", "The Civil Rights Movement", "The Labor Movement", "The Prohibition Movement"], answer: "B" },
    { question: "In which year did Christopher Columbus arrive in the Americas?", options: ["1388", "1492", "1504", "1620"], answer: "B" },
    { question: "What were the original 13 colonies?", options: ["States in the South", "British colonies that became the first US states", "Territories in the West", "French settlements"], answer: "B" },
    { question: "Who gave the famous 'I Have a Dream' speech?", options: ["Malcolm X", "Rosa Parks", "Martin Luther King Jr.", "Frederick Douglass"], answer: "C" },
    { question: "Which event started the Great Depression in America?", options: ["World War I ending", "The stock market crash of 1929", "The Civil War", "World War II"], answer: "B" },
  ],
  "History:Famous Leaders": [
    { question: "Who was the first female Prime Minister of the United Kingdom?", options: ["Queen Victoria", "Margaret Thatcher", "Theresa May", "Queen Elizabeth II"], answer: "B" },
    { question: "Who led India's non-violent independence movement?", options: ["Jawaharlal Nehru", "Subhas Bose", "Mahatma Gandhi", "B.R. Ambedkar"], answer: "C" },
    { question: "Which ancient leader conquered much of the known world by age 30?", options: ["Julius Caesar", "Napoleon Bonaparte", "Alexander the Great", "Genghis Khan"], answer: "C" },
    { question: "Who was Nelson Mandela?", options: ["First President of the USA", "Leader of the French Revolution", "South African anti-apartheid activist and president", "British Prime Minister"], answer: "C" },
    { question: "Who was the first woman to win a Nobel Prize?", options: ["Florence Nightingale", "Marie Curie", "Amelia Earhart", "Ada Lovelace"], answer: "B" },
    { question: "Which leader is associated with the French Revolution?", options: ["Louis XIV", "Napoleon Bonaparte", "Charles de Gaulle", "Robespierre"], answer: "D" },
    { question: "Who was the leader of the Soviet Union during World War II?", options: ["Vladimir Lenin", "Leon Trotsky", "Joseph Stalin", "Nikita Khrushchev"], answer: "C" },
    { question: "Cleopatra was the ruler of which ancient civilization?", options: ["Greece", "Rome", "Egypt", "Persia"], answer: "C" },
    { question: "Who invented the telephone?", options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Benjamin Franklin"], answer: "B" },
    { question: "Who was the first person to walk on the Moon?", options: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "John Glenn"], answer: "C" },
  ],
  "History:Inventions & Discoveries": [
    { question: "Who invented the light bulb?", options: ["Alexander Graham Bell", "Nikola Tesla", "Thomas Edison", "Benjamin Franklin"], answer: "C" },
    { question: "Who invented the telephone?", options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Guglielmo Marconi"], answer: "B" },
    { question: "Who discovered penicillin?", options: ["Marie Curie", "Louis Pasteur", "Alexander Fleming", "Edward Jenner"], answer: "C" },
    { question: "Who invented the World Wide Web?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Mark Zuckerberg"], answer: "C" },
    { question: "What did the Wright Brothers invent?", options: ["The automobile", "The aeroplane", "The steam engine", "The submarine"], answer: "B" },
    { question: "Who developed the theory of general relativity?", options: ["Isaac Newton", "Nikola Tesla", "Albert Einstein", "Stephen Hawking"], answer: "C" },
    { question: "What was the printing press invented by Johannes Gutenberg used for?", options: ["Printing newspapers only", "Mass-producing books and texts", "Creating artwork", "Writing letters"], answer: "B" },
    { question: "Who invented the steam engine that powered the Industrial Revolution?", options: ["James Watt", "George Stephenson", "Robert Fulton", "Thomas Newcomen"], answer: "A" },
    { question: "What did Marie Curie discover?", options: ["Gravity", "Radioactivity", "Penicillin", "DNA structure"], answer: "B" },
    { question: "Who is credited with discovering gravity after observing a falling apple?", options: ["Albert Einstein", "Galileo Galilei", "Isaac Newton", "Charles Darwin"], answer: "C" },
  ],
  "History:Historical Events": [
    { question: "In which year did man first land on the Moon?", options: ["1965", "1967", "1969", "1971"], answer: "C" },
    { question: "What was the Titanic?", options: ["A famous warship", "A passenger ship that sank in 1912", "A space shuttle", "A famous train"], answer: "B" },
    { question: "What caused the fall of the Roman Empire?", options: ["A volcanic eruption", "A combination of invasions, economic trouble, and internal conflicts", "A plague wiped everyone out", "It was conquered by Egypt"], answer: "B" },
    { question: "What was the Great Fire of London?", options: ["A battle in 1666", "A famous fire that destroyed much of London in 1666", "A planned demolition", "A volcanic eruption"], answer: "B" },
    { question: "What were the Crusades?", options: ["Trade journeys to Asia", "Religious military expeditions to the Holy Land", "Explorations of the Americas", "Scientific missions"], answer: "B" },
    { question: "What was the Berlin Wall?", options: ["A wall built to keep out invaders in ancient Germany", "A wall dividing East and West Berlin during the Cold War", "A famous art installation", "A historic Roman wall"], answer: "B" },
    { question: "In which year did India gain independence from Britain?", options: ["1942", "1945", "1947", "1950"], answer: "C" },
    { question: "What was the Black Death?", options: ["A famous battle", "A devastating plague that swept through Europe in the 14th century", "A volcanic eruption", "A type of famine"], answer: "B" },
    { question: "What event began World War I?", options: ["The sinking of the Titanic", "The assassination of Archduke Franz Ferdinand", "Germany invading France", "The Russian Revolution"], answer: "B" },
    { question: "What was the Space Race?", options: ["A competition to build the fastest rocket", "A competition between the USA and Soviet Union to achieve space milestones", "A race to the Moon between astronauts", "A series of satellite launches"], answer: "B" },
  ],
  "Geography:Countries & Capitals": [
    { question: "What is the capital city of France?", options: ["London", "Berlin", "Madrid", "Paris"], answer: "D" },
    { question: "What is the capital of Japan?", options: ["Beijing", "Seoul", "Bangkok", "Tokyo"], answer: "D" },
    { question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Brisbane", "Canberra"], answer: "D" },
    { question: "What is the capital of Brazil?", options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"], answer: "C" },
    { question: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Montreal", "Ottawa"], answer: "D" },
    { question: "What is the capital of India?", options: ["Mumbai", "Kolkata", "New Delhi", "Chennai"], answer: "C" },
    { question: "What is the capital of Egypt?", options: ["Alexandria", "Luxor", "Giza", "Cairo"], answer: "D" },
    { question: "What is the capital of South Africa?", options: ["Johannesburg", "Cape Town", "Pretoria", "Durban"], answer: "C" },
    { question: "What is the capital of Russia?", options: ["St. Petersburg", "Moscow", "Kiev", "Minsk"], answer: "B" },
    { question: "What is the capital of the United States?", options: ["New York", "Los Angeles", "Chicago", "Washington D.C."], answer: "D" },
  ],
  "Geography:Continents & Oceans": [
    { question: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], answer: "C" },
    { question: "Which is the largest continent?", options: ["Africa", "Asia", "North America", "Europe"], answer: "B" },
    { question: "Which is the smallest continent?", options: ["Europe", "Antarctica", "Australia", "South America"], answer: "C" },
    { question: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: "D" },
    { question: "Which ocean is the smallest?", options: ["Indian Ocean", "Southern Ocean", "Arctic Ocean", "Atlantic Ocean"], answer: "C" },
    { question: "Which continent is the coldest on Earth?", options: ["Asia", "North America", "Antarctica", "Europe"], answer: "C" },
    { question: "Which continent has the most countries?", options: ["Asia", "Europe", "Africa", "South America"], answer: "C" },
    { question: "Which ocean separates Europe from North America?", options: ["Pacific", "Indian", "Arctic", "Atlantic"], answer: "D" },
    { question: "On which continent is the Amazon rainforest located?", options: ["Africa", "Asia", "North America", "South America"], answer: "D" },
    { question: "Which continent surrounds the South Pole?", options: ["Asia", "Australia", "Antarctica", "Africa"], answer: "C" },
  ],
  "Geography:Landforms": [
    { question: "What is the tallest mountain in the world?", options: ["K2", "Kilimanjaro", "Mount Everest", "Mont Blanc"], answer: "C" },
    { question: "What is the longest river in the world?", options: ["Amazon", "Mississippi", "Nile", "Yangtze"], answer: "C" },
    { question: "What is a peninsula?", options: ["Land surrounded by water on all sides", "Land surrounded by water on three sides", "A mountain range", "A large flat plain"], answer: "B" },
    { question: "What is the largest desert in the world?", options: ["Sahara", "Arabian", "Gobi", "Antarctic Desert"], answer: "D" },
    { question: "What is a valley?", options: ["A flat highland area", "A low area between hills or mountains", "A type of island", "A rocky coastline"], answer: "B" },
    { question: "What is an archipelago?", options: ["A type of volcano", "A chain or group of islands", "A deep ocean trench", "A large plateau"], answer: "B" },
    { question: "What is the Grand Canyon?", options: ["A waterfall in South America", "A deep gorge in the USA carved by the Colorado River", "A mountain range in Europe", "An ancient Roman structure"], answer: "B" },
    { question: "What is a plateau?", options: ["A deep narrow valley", "A flat-topped elevated landform", "A type of desert sand dune", "A coastal wetland"], answer: "B" },
    { question: "What is the Amazon River known for?", options: ["Being the longest river in the world", "Having the largest flow of water of any river", "Being completely underground", "Flowing through Africa"], answer: "B" },
    { question: "What type of landform is formed at the mouth of a river?", options: ["Peninsula", "Delta", "Fjord", "Atoll"], answer: "B" },
  ],
  "Geography:Maps & Directions": [
    { question: "What are the four main compass directions?", options: ["Up, down, left, right", "North, South, East, West", "Forward, backward, sideways", "Top, bottom, left, right"], answer: "B" },
    { question: "What does a map scale tell you?", options: ["The direction of north", "The colors used on the map", "The relationship between distances on the map and real distances", "The names of countries"], answer: "C" },
    { question: "What is a compass rose?", options: ["A flower used for navigation", "A diagram on a map showing directions", "A type of map key", "A circular map"], answer: "B" },
    { question: "What is latitude?", options: ["Lines measuring distance east or west", "Lines measuring distance north or south from the equator", "The height of land above sea level", "The length of a country's border"], answer: "B" },
    { question: "What is the Equator?", options: ["The Prime Meridian", "An imaginary line at 0° latitude dividing Earth into north and south", "A map of the tropics", "The line of longitude at 180°"], answer: "B" },
    { question: "What does a map legend (key) show?", options: ["The name of the mapmaker", "The date the map was made", "What the symbols on the map mean", "The scale of the map only"], answer: "C" },
    { question: "What is longitude?", options: ["Lines measuring distance north or south", "Lines measuring distance east or west from the Prime Meridian", "A measure of altitude", "The distance from the equator"], answer: "B" },
    { question: "Which direction does the Sun rise from?", options: ["North", "South", "East", "West"], answer: "C" },
    { question: "What is a physical map?", options: ["A map showing political borders", "A map showing natural features like mountains and rivers", "A map of road routes", "A historical map"], answer: "B" },
    { question: "What is the Prime Meridian?", options: ["The line of 0° latitude", "The line of 0° longitude passing through Greenwich, England", "The International Date Line", "The Equator"], answer: "B" },
  ],
  "Geography:World Cultures": [
    { question: "Which country is famous for the Great Wall?", options: ["Japan", "India", "China", "Korea"], answer: "C" },
    { question: "What is the traditional Japanese robe called?", options: ["Sari", "Kimono", "Sarong", "Kaftan"], answer: "B" },
    { question: "Diwali is a festival celebrated mainly by which religion?", options: ["Islam", "Christianity", "Buddhism", "Hinduism"], answer: "D" },
    { question: "Which country is known for the Eiffel Tower?", options: ["Italy", "Spain", "Germany", "France"], answer: "D" },
    { question: "What is the most spoken language in the world by total speakers?", options: ["Spanish", "English", "Mandarin Chinese", "Hindi"], answer: "C" },
    { question: "Which country is the origin of pizza?", options: ["France", "Spain", "Italy", "Greece"], answer: "C" },
    { question: "What is the holy city for Muslims, Jews, and Christians?", options: ["Mecca", "Vatican City", "Jerusalem", "Medina"], answer: "C" },
    { question: "In which country is the Carnival of Rio de Janeiro held?", options: ["Argentina", "Colombia", "Mexico", "Brazil"], answer: "D" },
    { question: "What is the traditional music style of Argentina?", options: ["Salsa", "Samba", "Tango", "Flamenco"], answer: "C" },
    { question: "Which country has the most official languages?", options: ["USA", "India", "China", "South Africa"], answer: "D" },
  ],
  "Geography:Natural Wonders": [
    { question: "Where is the Great Barrier Reef located?", options: ["Brazil", "South Africa", "Australia", "Indonesia"], answer: "C" },
    { question: "What is the Victoria Falls?", options: ["A mountain in Africa", "A waterfall on the Zambia-Zimbabwe border", "A desert in Namibia", "A lake in Kenya"], answer: "B" },
    { question: "In which country is Mount Everest located?", options: ["India", "China", "Nepal/Tibet border", "Pakistan"], answer: "C" },
    { question: "What is the Northern Lights also known as?", options: ["Solar Flares", "Aurora Borealis", "Milky Way", "Zodiac Light"], answer: "B" },
    { question: "Where is the Amazon Rainforest mainly located?", options: ["Africa", "Asia", "Central America", "South America"], answer: "D" },
    { question: "What is the Sahara Desert?", options: ["The largest hot desert in the world, in North Africa", "A cold desert in Asia", "A desert in Australia", "A desert in South America"], answer: "A" },
    { question: "What is unique about the Dead Sea?", options: ["It has the most fish in the world", "It is so salty that people float easily", "It is the deepest sea", "It never freezes"], answer: "B" },
    { question: "What is the Grand Canyon carved by?", options: ["Glaciers", "Wind erosion", "The Colorado River", "Volcanic activity"], answer: "C" },
    { question: "Where is Niagara Falls located?", options: ["USA and Canada border", "South America", "Europe", "Asia"], answer: "A" },
    { question: "What is the Great Rift Valley?", options: ["A valley in the Grand Canyon", "A massive geological fracture running through East Africa", "A valley in the Himalayas", "A canyon in Australia"], answer: "B" },
  ],
  "General Knowledge:Animals": [
    { question: "What is the fastest land animal?", options: ["Lion", "Horse", "Cheetah", "Greyhound"], answer: "C" },
    { question: "How many legs does a spider have?", options: ["4", "6", "8", "10"], answer: "C" },
    { question: "Which animal is known as the 'King of the Jungle'?", options: ["Tiger", "Elephant", "Lion", "Gorilla"], answer: "C" },
    { question: "What do we call a group of wolves?", options: ["A herd", "A flock", "A pack", "A pride"], answer: "C" },
    { question: "Which bird cannot fly?", options: ["Eagle", "Parrot", "Penguin", "Sparrow"], answer: "C" },
    { question: "What is the largest animal on Earth?", options: ["Elephant", "Blue whale", "Giraffe", "Great white shark"], answer: "B" },
    { question: "How many hearts does an octopus have?", options: ["1", "2", "3", "4"], answer: "C" },
    { question: "Which animal can change its skin color?", options: ["Iguana", "Chameleon", "Lizard", "Gecko"], answer: "B" },
    { question: "What is a baby kangaroo called?", options: ["Cub", "Calf", "Joey", "Pup"], answer: "C" },
    { question: "Which is the only mammal that can fly?", options: ["Flying squirrel", "Bat", "Flying fish", "Sugar glider"], answer: "B" },
  ],
  "General Knowledge:Sports": [
    { question: "How many players are on a football (soccer) team?", options: ["9", "10", "11", "12"], answer: "C" },
    { question: "In which sport would you find a 'slam dunk'?", options: ["Football", "Baseball", "Basketball", "Volleyball"], answer: "C" },
    { question: "Which country invented cricket?", options: ["Australia", "India", "South Africa", "England"], answer: "D" },
    { question: "How many rings are on the Olympic flag?", options: ["4", "5", "6", "7"], answer: "B" },
    { question: "Which sport uses a shuttlecock?", options: ["Tennis", "Badminton", "Squash", "Ping pong"], answer: "B" },
    { question: "In tennis, what is the score called when both players have 40 points?", options: ["Tie", "Draw", "Deuce", "Equal"], answer: "C" },
    { question: "How many players are in a basketball team on the court?", options: ["4", "5", "6", "7"], answer: "B" },
    { question: "In which sport do you use a puck instead of a ball?", options: ["Football", "Cricket", "Ice hockey", "Baseball"], answer: "C" },
    { question: "Where are the Summer Olympics held every four years?", options: ["Always in Greece", "In a different host city each time", "Always in the USA", "Always in France"], answer: "B" },
    { question: "What is the term for three goals scored by one player in football (soccer)?", options: ["Triple", "Hat-trick", "Three-peat", "Treble"], answer: "B" },
  ],
  "General Knowledge:Food & Nature": [
    { question: "Which fruit is known as the 'king of fruits' in Asia?", options: ["Mango", "Durian", "Jackfruit", "Lychee"], answer: "B" },
    { question: "What is the most eaten grain in the world?", options: ["Wheat", "Corn", "Rice", "Oats"], answer: "C" },
    { question: "Which vegetable is known for improving your eyesight?", options: ["Broccoli", "Potato", "Carrot", "Onion"], answer: "C" },
    { question: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], answer: "C" },
    { question: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Quartz"], answer: "C" },
    { question: "Which tree produces acorns?", options: ["Maple", "Pine", "Oak", "Birch"], answer: "C" },
    { question: "What do bees produce?", options: ["Silk", "Honey", "Wax only", "Nectar only"], answer: "B" },
    { question: "What is the largest rainforest in the world?", options: ["Congo Rainforest", "Amazon Rainforest", "Daintree Rainforest", "Borneo Rainforest"], answer: "B" },
    { question: "Which vegetable is used to make fries?", options: ["Carrot", "Turnip", "Potato", "Parsnip"], answer: "C" },
    { question: "What is photosynthesis?", options: ["The process animals use to breathe", "How plants make food using sunlight", "How fungi grow", "How fish absorb oxygen"], answer: "B" },
  ],
  "General Knowledge:Arts & Music": [
    { question: "How many strings does a standard guitar have?", options: ["4", "5", "6", "7"], answer: "C" },
    { question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Pablo Picasso"], answer: "C" },
    { question: "What is the fastest tempo in classical music called?", options: ["Andante", "Moderato", "Allegro", "Prestissimo"], answer: "D" },
    { question: "Which instrument has black and white keys?", options: ["Guitar", "Violin", "Piano", "Trumpet"], answer: "C" },
    { question: "How many colors are in the primary colors of light?", options: ["2", "3", "4", "5"], answer: "B" },
    { question: "Who painted the Sistine Chapel ceiling?", options: ["Leonardo da Vinci", "Raphael", "Michelangelo", "Donatello"], answer: "C" },
    { question: "What is a symphony?", options: ["A type of dance", "A long musical piece for an orchestra", "A solo piano piece", "A type of opera"], answer: "B" },
    { question: "Which art style uses dots of color to make pictures?", options: ["Cubism", "Impressionism", "Pointillism", "Surrealism"], answer: "C" },
    { question: "What is the term for the speed of a piece of music?", options: ["Volume", "Pitch", "Tempo", "Rhythm"], answer: "C" },
    { question: "Which famous composer was deaf when he wrote his 9th Symphony?", options: ["Mozart", "Bach", "Beethoven", "Chopin"], answer: "C" },
  ],
  "General Knowledge:Technology": [
    { question: "Who invented the World Wide Web?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Mark Zuckerberg"], answer: "C" },
    { question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Program Utility", "Core Power Unit", "Central Power Upgrade"], answer: "A" },
    { question: "What is the Internet?", options: ["A type of computer", "A global network connecting computers worldwide", "A computer program", "A type of software"], answer: "B" },
    { question: "What does 'Wi-Fi' allow devices to do?", options: ["Charge faster", "Connect to the internet wirelessly", "Print documents", "Store more data"], answer: "B" },
    { question: "What is a computer virus?", options: ["A type of computer hardware", "A program that damages or disrupts computers", "An internet browser", "A type of USB drive"], answer: "B" },
    { question: "What does 'app' stand for?", options: ["Application", "Apple program", "Automatic process", "Accessible platform"], answer: "A" },
    { question: "Which company made the first iPhone?", options: ["Samsung", "Microsoft", "Apple", "Google"], answer: "C" },
    { question: "What is artificial intelligence (AI)?", options: ["A type of robot only", "Computer systems that can perform tasks that normally need human intelligence", "A video game technology", "A type of database"], answer: "B" },
    { question: "What is a password used for?", options: ["To speed up a computer", "To protect your account from unauthorized access", "To download files", "To connect to Wi-Fi"], answer: "B" },
    { question: "What does 'download' mean?", options: ["Sending files to another device", "Transferring data from the internet to your device", "Deleting files from your computer", "Printing a document"], answer: "B" },
  ],
  "General Knowledge:Mixed": [
    { question: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], answer: "C" },
    { question: "How many sides does a hexagon have?", options: ["4", "5", "6", "7"], answer: "C" },
    { question: "Which planet is known as the Red Planet?", options: ["Jupiter", "Venus", "Saturn", "Mars"], answer: "D" },
    { question: "What is the square root of 64?", options: ["6", "7", "8", "9"], answer: "C" },
    { question: "What do bees produce?", options: ["Silk", "Honey", "Wax only", "Nectar only"], answer: "B" },
    { question: "In which sport would you find a 'slam dunk'?", options: ["Football", "Baseball", "Basketball", "Volleyball"], answer: "C" },
    { question: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Quartz"], answer: "C" },
    { question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Pablo Picasso"], answer: "C" },
    { question: "What is the fastest land animal?", options: ["Lion", "Horse", "Cheetah", "Greyhound"], answer: "C" },
    { question: "How many strings does a standard guitar have?", options: ["4", "5", "6", "7"], answer: "C" },
  ],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function topicToTypes(topic: Topic): ("add" | "sub" | "mult" | "div" | "word")[] {
  switch (topic) {
    case "Addition & Subtraction":
    case "Addition":
      return ["add", "sub"];
    case "Multiplication":
      return ["mult"];
    case "Division":
      return ["div"];
    case "Word Problems":
      return ["word"];
    case "Fractions":
      return ["div", "word"];
    default:
      return ["add", "sub", "mult", "div", "word"];
  }
}

function genAdd(_level: Difficulty, id: string): MathProblem {
  const x = randomInt(10, 99);
  const y = randomInt(10, 99);
  return { id, question: `${x} + ${y} = ?`, correctAnswer: x + y, difficulty: 1, type: "add", operands: [x, y] };
}

function genSub(_level: Difficulty, id: string): MathProblem {
  const x = randomInt(20, 99);
  const y = randomInt(1, x - 1);
  return { id, question: `${x} − ${y} = ?`, correctAnswer: x - y, difficulty: 1, type: "sub", operands: [x, y] };
}

function genMult(_level: Difficulty, id: string): MathProblem {
  const a = randomInt(2, 12);
  const b = randomInt(2, 12);
  return { id, question: `${a} × ${b} = ?`, correctAnswer: a * b, difficulty: 3, type: "mult", operands: [a, b] };
}

function genDiv(_level: Difficulty, id: string): MathProblem {
  const b = randomInt(2, 12);
  const product = b * randomInt(2, 12);
  return { id, question: `${product} ÷ ${b} = ?`, correctAnswer: product / b, difficulty: 4, type: "div", operands: [product, b] };
}

function genWord(level: Difficulty, id: string): MathProblem {
  const pool = WORD_PROBLEMS[level] ?? WORD_PROBLEMS[1];
  const idx = randomInt(0, pool.length - 1);
  const q = pool[idx]!;
  const answers: number[] = {
    1: [24 - 7, 15 - 8, 18 + 9],
    2: [156 - 48, 234 + 67, 189 - 94],
    3: [6 * 8, 4 * 9, 7 * 5],
    4: [24 / 6, 35 / 5, 48 / 8],
    5: [3 * 4 + 2 * 5, 60 * 3, 5 * 12 - 8],
  }[level]!;
  return { id, question: q, correctAnswer: answers[idx] ?? 0, difficulty: level, type: "word" };
}

export function generateProblem(level: Difficulty, topic: Topic = "Mixed"): MathProblem {
  const id = generateId();
  const allowedTypes = topicToTypes(topic);
  const type = allowedTypes[randomInt(0, allowedTypes.length - 1)]!;
  switch (type) {
    case "add": return genAdd(level, id);
    case "sub": return genSub(level, id);
    case "mult": return genMult(level, id);
    case "div": return genDiv(level, id);
    case "word": return genWord(level, id);
    default: return genAdd(level, id);
  }
}

// ─── Answer Checking ────────────────────────────────────────────────────────

export function checkAnswer(problem: MathProblem, answer: number | string): boolean {
  if (typeof problem.correctAnswer === "string") {
    return String(answer).trim().toUpperCase() === problem.correctAnswer.trim().toUpperCase();
  }
  const num = typeof answer === "string" ? parseFloat(answer) : answer;
  if (Number.isNaN(num)) return false;
  return Math.abs(num - (problem.correctAnswer as number)) < 0.001;
}

// ─── Hint / Explanation ─────────────────────────────────────────────────────

export function generateHint(problem: MathProblem): string {
  if (problem.options && problem.options.length === 4) {
    const wrongOptions = problem.options.filter(
      (_, i) => ["A", "B", "C", "D"][i] !== problem.correctAnswer,
    );
    return `Try to eliminate the unlikely answers. You can rule out: "${wrongOptions[0]}".`;
  }
  switch (problem.type) {
    case "add": return "Try adding the ones place first, then the tens.";
    case "sub": return "Start with the ones. If you need to borrow, take 1 from the tens place.";
    case "mult": return problem.operands ? `Think: ${problem.operands[0]} groups of ${problem.operands[1]}.` : "Break it into smaller steps.";
    case "div": return problem.operands ? `How many times does ${problem.operands[1]} go into ${problem.operands[0]}?` : "Think of sharing equally.";
    case "word": return "Read the problem carefully. Find the key numbers and decide which operation to use.";
    default: return "Take your time and double-check your work.";
  }
}

export function generateExplanation(problem: MathProblem): string {
  if (problem.options && typeof problem.correctAnswer === "string") {
    const idx = ["A", "B", "C", "D"].indexOf(problem.correctAnswer);
    const correctText = problem.options[idx] ?? problem.correctAnswer;
    return `The correct answer is ${problem.correctAnswer}: "${correctText}".`;
  }
  if (problem.operands && problem.type !== "word") {
    const [a, b] = problem.operands;
    const ans = problem.correctAnswer as number;
    switch (problem.type) {
      case "add": return `${a} + ${b} = ${ans}.`;
      case "sub": return `${a} − ${b} = ${ans}.`;
      case "mult": return `${a} × ${b} = ${ans}.`;
      case "div": return `${a} ÷ ${b} = ${ans}.`;
    }
  }
  return `The correct answer is ${problem.correctAnswer}.`;
}

// ─── Difficulty Adjustment ──────────────────────────────────────────────────

export function adjustDifficulty(
  currentLevel: Difficulty,
  consecutiveCorrect: number,
  consecutiveFailed: number,
): Difficulty {
  if (consecutiveCorrect >= 3 && currentLevel < 5) return (currentLevel + 1) as Difficulty;
  if (consecutiveFailed >= 2 && currentLevel > 1) return (currentLevel - 1) as Difficulty;
  return currentLevel;
}

// ─── Encouragement Messages ─────────────────────────────────────────────────

export function getEncouragement(teamAccuracy: number): string {
  if (teamAccuracy >= 75) return "Excellent collaboration! 🌟";
  if (teamAccuracy >= 50) return "Good effort — discuss and improve! 💪";
  return "Let's slow down and think together! 🤝";
}

export function getSessionEncouragement(teamAccuracy: number): string {
  if (teamAccuracy > 80) return "Amazing teamwork! 🏆";
  if (teamAccuracy >= 60) return "Great improvement! 🌟";
  return "Keep practicing together! 💪";
}

// ─── Room Management ────────────────────────────────────────────────────────

function freshPlayer(id: string, name: string, isBot: boolean = false, username?: string, avatar?: string): Player {
  return {
    id,
    name: name.slice(0, 20),
    username: username?.trim().slice(0, 32),
    isBot,
    isCorrect: false,
    wrongAnswers: [],
    attempts: 0,
    joinedAt: Date.now(),
    correctCount: 0,
    questionsParticipated: 0,
    contributionCount: 0,
    helpedCount: 0,
    avatar,
  };
}

const BOT_NAMES = ["🤝 Team Helper"];
const BOT_ID_PREFIX = "bot-";

export function addBotPlayer(room: GameRoom): GameRoom {
  const botIdx = room.players.filter((p) => p.isBot).length;
  const botId = `${BOT_ID_PREFIX}${Date.now()}-${botIdx}`;
  const botName = BOT_NAMES[botIdx % BOT_NAMES.length]!;
  const bot = freshPlayer(botId, botName, true);
  return { ...room, players: [...room.players, bot] };
}

export function createRoom(
  roomId: string,
  subject: Subject = "Math",
  topic: Topic = "Mixed",
  grade: Grade = 4,
  groupCode?: string,
  gameMode: GameMode = "casual",
): GameRoom {
  return {
    roomId,
    players: [],
    currentLevel: 1,
    teamScore: 0,
    teamStars: 0,
    hintsUsed: 0,
    groupCode,
    gameMode,
    currentProblem: null,
    currentQuestions: [],
    currentQuestionIndex: -1,
    subject,
    topic,
    grade,
    consecutiveCorrect: 0,
    consecutiveFailed: 0,
    status: "waiting",
    problemsSolved: 0,
    sessionStartTime: Date.now(),
    problemHistory: [],
    teamStreak: 0,
    bestTeamStreak: 0,
    teamComboLevel: 0,
    powerUps: defaultPowerUps(),
    activeEffects: {},
    usedQuestionHashes: [],
  };
}

export function addPlayer(room: GameRoom, playerId: string, name: string, username?: string, avatar?: string): GameRoom {
  if (room.players.length >= 4) return room;
  if (room.players.some((p) => p.id === playerId)) return room;
  const player = freshPlayer(playerId, name, false, username, avatar);
  return { ...room, players: [...room.players, player] };
}

export function mapOpenAIQuestionToMathProblem(q: OpenAIQuestion, index: number, level: Difficulty): MathProblem {
  return {
    id: `openai-${index}-${generateId()}`,
    question: q.question,
    correctAnswer: q.answer.trim().toUpperCase(),
    difficulty: level,
    type: "word",
    options: q.options,
  };
}

function getNextProblemFromBatch(room: GameRoom, _level: Difficulty): { problem: MathProblem | null; nextIndex: number } {
  const nextIndex = room.currentQuestionIndex + 1;
  const fromBatch = room.currentQuestions[nextIndex];
  if (fromBatch) return { problem: fromBatch, nextIndex };
  return { problem: null, nextIndex: room.currentQuestionIndex };
}

function resetPlayersForNewQuestion(players: Player[]): Player[] {
  return players.map((p) => ({
    ...p,
    isCorrect: false,
    wrongAnswers: [],
    attempts: 0,
    answer: undefined,
    answeredAt: undefined,
    questionsParticipated: p.questionsParticipated + 1,
  }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function startGameWithLocalFallback(room: GameRoom, subject: Subject, topic: Topic, grade: Grade, questionCount: number = DEFAULT_QUESTIONS, gameStageLevel?: number): GameRoom {
  const n = Math.max(5, Math.min(14, questionCount));
  let problems: MathProblem[];
  if (subject === "Math") {
    problems = Array.from({ length: n }, () => generateProblem(room.currentLevel, topic));
  } else {
    const topicKey = `${subject}:${topic}`;
    let bank = FALLBACK_QUESTIONS[topicKey];
    if (!bank) {
      const subjectKeys = Object.keys(FALLBACK_QUESTIONS).filter((k) => k.startsWith(`${subject}:`));
      if (subjectKeys.length > 0) {
        const allQs = subjectKeys.flatMap((k) => FALLBACK_QUESTIONS[k]!);
        bank = shuffle(allQs).slice(0, n);
      } else {
        bank = FALLBACK_QUESTIONS["General Knowledge:Mixed"]!;
      }
    }
    problems = shuffle(bank).slice(0, n).map((q, i) => mapOpenAIQuestionToMathProblem(q, i, room.currentLevel));
  }
  return {
    ...room,
    status: "playing",
    subject, topic, grade,
    gameStageLevel: gameStageLevel ?? 1,
    currentQuestions: problems,
    currentQuestionIndex: 0,
    currentProblem: problems[0]!,
    consecutiveCorrect: 0,
    consecutiveFailed: 0,
    questionStartTime: Date.now(),
    players: resetPlayersForNewQuestion(room.players),
  };
}

export function startGameWithQuestions(room: GameRoom, questions: MathProblem[], subject: Subject, topic: Topic, grade: Grade, gameStageLevel?: number): GameRoom {
  if (questions.length === 0) return room;
  return {
    ...room,
    status: "playing",
    subject, topic, grade,
    gameStageLevel: gameStageLevel ?? 1,
    currentQuestions: questions,
    currentQuestionIndex: 0,
    currentProblem: questions[0]!,
    consecutiveCorrect: 0,
    consecutiveFailed: 0,
    questionStartTime: Date.now(),
    players: resetPlayersForNewQuestion(room.players),
  };
}

export function startGame(room: GameRoom): GameRoom {
  return startGameWithLocalFallback(room, room.subject ?? "Math", room.topic || "Mixed", room.grade ?? 4);
}

// ─── Individual answer check (called per player, immediately) ───────────────

export interface AnswerResult {
  correct: boolean;
  hint?: string;
  explanation?: string;
}

/** Store answer without validating. Used for cooperative "all submit before validation". */
export function storePlayerAnswer(room: GameRoom, playerId: string, answer: number | string): GameRoom {
  if (!room.currentProblem || room.status !== "playing") return room;
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.isBot || player.attempts >= 1) return room;
  const now = Date.now();
  const updatedPlayers = room.players.map((p) =>
    p.id === playerId ? { ...p, answer, attempts: 1, answeredAt: now } : p,
  );
  return { ...room, players: updatedPlayers };
}

/** Check if all human players have submitted (attempts >= 1). */
export function allHumansSubmitted(room: GameRoom): boolean {
  const humans = room.players.filter((p) => !p.isBot);
  if (humans.length === 0) return false;
  return humans.every((p) => p.attempts >= 1);
}

/** Validate all players who have pending answers. Returns updated room and per-player results. */
export function validateAllPendingAnswers(
  room: GameRoom,
): { room: GameRoom; results: Map<string, AnswerResult> } {
  const results = new Map<string, AnswerResult>();
  let updated = room;
  for (const player of room.players) {
    if (player.isBot || player.isCorrect || player.attempts < 1 || player.answer === undefined) continue;
    const { room: r, result } = processPlayerAnswer(updated, player.id, player.answer);
    updated = r;
    results.set(player.id, result);
  }
  return { room: updated, results };
}

export function processPlayerAnswer(
  room: GameRoom,
  playerId: string,
  answer: number | string,
): { room: GameRoom; result: AnswerResult } {
  if (!room.currentProblem || room.status !== "playing") {
    return { room, result: { correct: false } };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.isCorrect) {
    return { room, result: { correct: false } };
  }

  // Serious mode: one chance per question — no retries
  if (room.gameMode === "serious" && player.attempts >= 1) {
    return { room, result: { correct: false } };
  }

  const correct = checkAnswer(room.currentProblem, answer);
  const now = Date.now();

  if (correct) {
    const updatedPlayers = room.players.map((p) =>
      p.id === playerId
        ? { ...p, isCorrect: true, answer, answeredAt: now, attempts: p.attempts + 1, correctCount: p.correctCount + 1 }
        : p,
    );
    return {
      room: { ...room, players: updatedPlayers },
      result: { correct: true },
    };
  }

  // Wrong answer
  const wrongLetter = typeof answer === "string" ? answer.trim().toUpperCase() : String(answer);
  const newAttempts = player.attempts + 1;
  const newWrongAnswers = [...player.wrongAnswers];
  if (!newWrongAnswers.includes(wrongLetter)) newWrongAnswers.push(wrongLetter);

  const updatedPlayers = room.players.map((p) =>
    p.id === playerId
      ? { ...p, answer, attempts: newAttempts, wrongAnswers: newWrongAnswers }
      : p,
  );

  // In serious mode we don't count hints (no retry) and don't show hint for retry
  const hintsUsed = room.gameMode === "casual" ? room.hintsUsed + (newAttempts === 1 ? 1 : 0) : room.hintsUsed;
  const result: AnswerResult = { correct: false };
  if (room.gameMode === "casual") {
    if (newAttempts >= 1) result.hint = generateHint(room.currentProblem);
    if (newAttempts >= 2) result.explanation = generateExplanation(room.currentProblem);
  } else {
    // Serious: show explanation only after wrong (one chance)
    result.explanation = generateExplanation(room.currentProblem);
  }

  return {
    room: { ...room, players: updatedPlayers, hintsUsed },
    result,
  };
}

// ─── Check if all players are done (humans only; helper does not answer) ───

export function allPlayersDone(room: GameRoom): boolean {
  const humans = room.players.filter((p) => !p.isBot);
  if (humans.length === 0) return false;
  // Serious: every human has answered (one chance each)
  if (room.gameMode === "serious") {
    return humans.every((p) => p.attempts >= 1);
  }
  return humans.every((p) => p.isCorrect);
}

// ─── Team Momentum Helpers ──────────────────────────────────────────────────

function getComboLevel(streak: number): number {
  if (streak >= 5) return 3; // fire
  if (streak >= 3) return 2; // hot
  if (streak >= 2) return 1; // warm
  return 0;
}

function calculateTeamBonus(room: GameRoom, teamPassed: boolean): {
  bonusPoints: number;
  newStreak: number;
  allCorrect: boolean;
  speedBonus: boolean;
} {
  const humanPlayers = room.players.filter((p) => !p.isBot);
  const allCorrect = humanPlayers.length > 0 && humanPlayers.every((p) => p.isCorrect);

  if (!teamPassed) {
    return { bonusPoints: 0, newStreak: 0, allCorrect: false, speedBonus: false };
  }

  const newStreak = room.teamStreak + 1;
  let bonusPoints = 0;

  // Streak bonus
  const streakIdx = Math.min(newStreak, TEAM_STREAK_BONUS.length - 1);
  bonusPoints += TEAM_STREAK_BONUS[streakIdx] ?? 0;

  // All-correct bonus
  if (allCorrect) {
    bonusPoints += TEAM_ALL_CORRECT_BONUS;
  }

  // Speed bonus: everyone answered within threshold
  let speedBonus = false;
  if (room.questionStartTime != null && allCorrect) {
    const allFast = humanPlayers.every(
      (p) => p.answeredAt != null && (p.answeredAt - room.questionStartTime!) <= TEAM_SPEED_BONUS_THRESHOLD_MS,
    );
    if (allFast) {
      bonusPoints += TEAM_SPEED_BONUS;
      speedBonus = true;
    }
  }

  return { bonusPoints, newStreak, allCorrect, speedBonus };
}

// ─── Power-Up Activation ────────────────────────────────────────────────────

export function activatePowerUp(
  room: GameRoom,
  type: PowerUpType,
): { room: GameRoom; success: boolean; message?: string } {
  if (room.status !== "playing" || !room.currentProblem) {
    return { room, success: false, message: "Not in a game" };
  }
  const slot = room.powerUps?.[type];
  if (!slot || !slot.available || slot.used) {
    return { room, success: false, message: "Power-up not available" };
  }

  const updatedPowerUps: PowerUpState = {
    ...room.powerUps,
    [type]: { available: true, used: true },
  };

  if (type === "team_shield") {
    const problem = room.currentProblem;
    if (!problem.options || problem.options.length < 4) {
      return { room, success: false, message: "No options to remove" };
    }
    const correctLetter = String(problem.correctAnswer).trim().toUpperCase();
    const letters = ["A", "B", "C", "D"];
    const wrongLetters = letters.filter((l) => l !== correctLetter);
    const removed = wrongLetters.slice(0, 2);
    return {
      room: { ...room, powerUps: updatedPowerUps, activeEffects: { ...room.activeEffects, shieldRemovedOptions: removed } },
      success: true,
    };
  }

  if (type === "time_boost") {
    const newStart = (room.questionStartTime ?? Date.now()) - 10000;
    return {
      room: { ...room, powerUps: updatedPowerUps, questionStartTime: newStart, activeEffects: { ...room.activeEffects, timeBonusApplied: true } },
      success: true,
    };
  }

  if (type === "bonus_round") {
    return {
      room: { ...room, powerUps: updatedPowerUps, activeEffects: { ...room.activeEffects, bonusRoundActive: true } },
      success: true,
    };
  }

  return { room, success: false };
}

function earnPowerUps(room: GameRoom): PowerUpState {
  const pu = { ...room.powerUps };
  // Earn Team Shield at 3 consecutive correct
  if (room.consecutiveCorrect >= 3 && !pu.team_shield.available && !pu.team_shield.used) {
    pu.team_shield = { available: true, used: false };
  }
  // Earn Time Boost at team streak 5
  if (room.teamStreak >= 5 && !pu.time_boost.available && !pu.time_boost.used) {
    pu.time_boost = { available: true, used: false };
  }
  return pu;
}

// ─── Advance to next question ───────────────────────────────────────────────

export function advanceToNextQuestion(room: GameRoom): GameRoom {
  const problem = room.currentProblem;
  const humanPlayers = room.players.filter((p) => !p.isBot);
  const correctHumans = humanPlayers.filter((p) => p.isCorrect).length;
  const teamPassed = humanPlayers.length > 0 && (correctHumans / humanPlayers.length) >= TEAM_CORRECT_THRESHOLD;

  if (problem) {
    const solvedSoFar = teamPassed ? room.problemsSolved + 1 : room.problemsSolved;
    const totalQuestions = room.currentQuestions.length || 1;
    const newStars = Math.round((solvedSoFar / totalQuestions) * 5);
    // Bonus round doubles base points
    const basePoints = room.activeEffects?.bonusRoundActive ? TEAM_POINTS_PER_QUESTION * 2 : TEAM_POINTS_PER_QUESTION;
    const newScore = teamPassed ? room.teamScore + basePoints : room.teamScore;

    // Calculate team momentum bonus
    const bonus = calculateTeamBonus(room, teamPassed);
    const newStreak = bonus.newStreak;
    const bestStreak = Math.max(room.bestTeamStreak, newStreak);

    const avgMs = humanPlayers.length > 0 && room.questionStartTime
      ? Math.round(
          humanPlayers
            .filter((p) => p.answeredAt != null)
            .reduce((sum, p) => sum + (p.answeredAt! - room.questionStartTime!), 0) /
          Math.max(1, humanPlayers.filter((p) => p.answeredAt != null).length),
        )
      : undefined;

    // Update player contribution tracking
    const updatedPlayers = room.players.map((p) => {
      if (p.isBot) return p;
      if (!teamPassed || !p.isCorrect) return p;
      const newContribution = p.contributionCount + 1;
      const otherCorrect = humanPlayers.filter((h) => h.isCorrect && h.id !== p.id).length;
      const totalHumans = humanPlayers.length;
      const wouldPassWithout = totalHumans > 0 && (otherCorrect / totalHumans) >= TEAM_CORRECT_THRESHOLD;
      const helped = !wouldPassWithout ? 1 : 0;
      return { ...p, contributionCount: newContribution, helpedCount: p.helpedCount + helped };
    });

    room = {
      ...room,
      players: updatedPlayers,
      teamScore: newScore + bonus.bonusPoints,
      teamStars: newStars,
      problemHistory: [...room.problemHistory, {
        problem,
        correct: teamPassed,
        allPlayersCorrect: bonus.allCorrect,
        averageResponseMs: avgMs,
      }],
      problemsSolved: teamPassed ? room.problemsSolved + 1 : room.problemsSolved,
      consecutiveCorrect: teamPassed ? room.consecutiveCorrect + 1 : 0,
      consecutiveFailed: teamPassed ? 0 : room.consecutiveFailed + 1,
      teamStreak: newStreak,
      bestTeamStreak: bestStreak,
      teamComboLevel: getComboLevel(newStreak),
      // Clear per-question active effects
      activeEffects: {},
    };

    room = { ...room, powerUps: earnPowerUps(room) };
  }

  const newLevel = adjustDifficulty(room.currentLevel, room.consecutiveCorrect, room.consecutiveFailed);
  const { problem: nextProblem, nextIndex } = getNextProblemFromBatch(room, newLevel);

  if (!nextProblem) {
    return { ...room, currentLevel: newLevel, status: "session_summary", sessionSummaryAt: Date.now() };
  }

  return {
    ...room,
    currentLevel: newLevel,
    currentQuestionIndex: nextIndex,
    currentProblem: nextProblem,
    questionStartTime: Date.now(),
    status: "playing",
    players: resetPlayersForNewQuestion(room.players),
  };
}

// ─── Timer expiry: mark everyone not-correct as done ────────────────────────

export function handleTimerExpiry(room: GameRoom): GameRoom {
  // Nothing to do if not playing
  if (room.status !== "playing" || !room.currentProblem) return room;
  return advanceToNextQuestion(room);
}

export function moveToSessionSummary(room: GameRoom): GameRoom {
  return { ...room, status: "session_summary", sessionSummaryAt: Date.now() };
}

export function getTeamAccuracy(room: GameRoom): number {
  if (room.problemHistory.length === 0) return 0;
  return Math.round((room.problemsSolved / room.problemHistory.length) * 100);
}

export function getQuestionsRemaining(room: GameRoom): number {
  return Math.max(0, room.currentQuestions.length - room.currentQuestionIndex - 1);
}

