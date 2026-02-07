export const CLASSES = [
    {
        id: "barbarian",
        name: "Bárbaro",
        desc: "Un guerrero feroz que puede entrar en una furia de batalla.",
        hitDie: 12,
        icon: "🪓",
        primaryStats: ["str"]
    },
    {
        id: "bard",
        name: "Bardo",
        desc: "Un mago inspirador cuyo poder resuena con la música de la creación.",
        hitDie: 8,
        icon: "🎻",
        primaryStats: ["cha"]
    },
    {
        id: "cleric",
        name: "Clérigo",
        desc: "Un campeón sacerdotal que maneja magia divina al servicio de un poder superior.",
        hitDie: 8,
        icon: "🙏",
        primaryStats: ["wis"]
    },
    {
        id: "druid",
        name: "Druida",
        desc: "Un sacerdote de la Antigua Fe, que usa los poderes de la naturaleza.",
        hitDie: 8,
        icon: "🌿",
        primaryStats: ["wis"]
    },
    {
        id: "fighter",
        name: "Guerrero",
        desc: "Un maestro del combate marcial, hábil con una variedad de armas y armaduras.",
        hitDie: 10,
        icon: "⚔️",
        primaryStats: ["str", "dex"]
    },
    {
        id: "monk",
        name: "Monje",
        desc: "Un maestro de las artes marciales, que aprovecha el poder del cuerpo.",
        hitDie: 8,
        icon: "🥋",
        primaryStats: ["dex", "wis"]
    },
    {
        id: "paladin",
        name: "Paladín",
        desc: "Un guerrero sagrado atado a un juramento sagrado.",
        hitDie: 10,
        icon: "🛡️",
        primaryStats: ["str", "cha"]
    },
    {
        id: "ranger",
        name: "Explorador",
        desc: "Un guerrero que usa destreza marcial y magia natural para combatir amenazas.",
        hitDie: 10,
        icon: "🏹",
        primaryStats: ["dex", "wis"]
    },
    {
        id: "rogue",
        name: "Pícaro",
        desc: "Un sinvergüenza que usa el sigilo y la astucia para superar obstáculos.",
        hitDie: 8,
        icon: "🗡️",
        primaryStats: ["dex"]
    },
    {
        id: "sorcerer",
        name: "Hechicero",
        desc: "Un lanzador de conjuros con magia innata derivada de un don o linaje.",
        hitDie: 6,
        icon: "🔮",
        primaryStats: ["cha"]
    },
    {
        id: "warlock",
        name: "Brujo",
        desc: "Un portador de magia derivada de un pacto con una entidad extraplanar.",
        hitDie: 8,
        icon: "👁️",
        primaryStats: ["cha"]
    },
    {
        id: "wizard",
        name: "Mago",
        desc: "Un usuario de magia escolástica capaz de manipular las estructuras de la realidad.",
        hitDie: 6,
        icon: "📚",
        primaryStats: ["int"]
    }
];

export const RACES = [
    { id: "human", name: "Humano", desc: "Adaptables y ambiciosos." },
    { id: "elf", name: "Elfo", desc: "Mágicos y de larga vida." },
    { id: "dwarf", name: "Enano", desc: "Audaces y resistentes." },
    { id: "halfling", name: "Mediano", desc: "Pequeños y afortunados." },
    { id: "dragonborn", name: "Dracónido", desc: "Orgullosos parientes de dragones." },
    { id: "gnome", name: "Gnomo", desc: "Pequeños inventores curiosos." },
    { id: "half-elf", name: "Semielfo", desc: "Combinan las mejores cualidades." },
    { id: "half-orc", name: "Semiorco", desc: "Fuertes y feroces." },
    { id: "tiefling", name: "Tiefling", desc: "Herederos de un linaje infernal." },
    { id: "goblin", name: "Goblin", desc: "Pequeños, ágiles y traviesos." }
];

export const SKILLS_LIST = [
    { id: "acrobatics", name: "Acrobacias", stat: "dex" },
    { id: "animal_handling", name: "Trato con Animales", stat: "wis" },
    { id: "arcana", name: "Arcana", stat: "int" },
    { id: "athletics", name: "Atletismo", stat: "str" },
    { id: "deception", name: "Engaño", stat: "cha" },
    { id: "history", name: "Historia", stat: "int" },
    { id: "insight", name: "Perspicacia", stat: "wis" },
    { id: "intimidation", name: "Intimidación", stat: "cha" },
    { id: "investigation", name: "Investigación", stat: "int" },
    { id: "medicine", name: "Medicina", stat: "wis" },
    { id: "nature", name: "Naturaleza", stat: "int" },
    { id: "perception", name: "Percepción", stat: "wis" },
    { id: "performance", name: "Interpretación", stat: "cha" },
    { id: "persuasion", name: "Persuasión", stat: "cha" },
    { id: "religion", name: "Religión", stat: "int" },
    { id: "sleight_of_hand", name: "Juego de Manos", stat: "dex" },
    { id: "stealth", name: "Sigilo", stat: "dex" },
    { id: "survival", name: "Supervivencia", stat: "wis" },
];
