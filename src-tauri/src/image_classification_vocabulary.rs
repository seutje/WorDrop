pub struct LabelDefinition {
    pub name: &'static str,
    pub category: &'static str,
    pub prompts: &'static [&'static str],
    pub generic_fallback: bool,
}

macro_rules! subtype {
    ($name:literal, $category:literal, [$($prompt:literal),+ $(,)?]) => {
        LabelDefinition { name: $name, category: $category, prompts: &[$($prompt),+], generic_fallback: false }
    };
    (fallback $name:literal, $category:literal, [$($prompt:literal),+ $(,)?]) => {
        LabelDefinition { name: $name, category: $category, prompts: &[$($prompt),+], generic_fallback: true }
    };
}

pub const CATEGORY_PROMPTS: [LabelDefinition; 6] = [
    subtype!(
        "top",
        "top",
        [
            "a photo of a top",
            "an upper-body garment",
            "a shirt, t-shirt, blouse, sweater, hoodie, or similar upper-body clothing"
        ]
    ),
    subtype!(
        "bottom",
        "bottom",
        [
            "a photo of bottoms",
            "a lower-body garment",
            "pants, trousers, jeans, shorts, or a skirt"
        ]
    ),
    subtype!(
        "dress",
        "dress",
        [
            "a photo of a dress",
            "a one-piece dress garment",
            "a full-body garment worn as one piece"
        ]
    ),
    subtype!(
        "shoes",
        "shoes",
        [
            "a photo of shoes",
            "footwear",
            "sneakers, boots, sandals, heels, or formal shoes"
        ]
    ),
    subtype!(
        "outerwear",
        "outerwear",
        [
            "a photo of outerwear",
            "an outer layer garment",
            "a jacket, coat, blazer, parka, or similar outer layer"
        ]
    ),
    subtype!(
        "accessory",
        "accessory",
        [
            "a photo of a fashion accessory",
            "an accessory worn or carried with clothing",
            "a bag, belt, hat, scarf, jewelry, or similar item"
        ]
    ),
];

pub const SUBTYPES: &[LabelDefinition] = &[
    subtype!(
        "T-shirt",
        "top",
        [
            "a photo of a t-shirt",
            "a short sleeve t-shirt",
            "a casual tee"
        ]
    ),
    subtype!(
        "Long-sleeve T-shirt",
        "top",
        ["a long sleeve t-shirt", "a long sleeved casual tee"]
    ),
    subtype!(fallback "Shirt", "top", ["a button-up shirt", "a collared shirt", "a button-down shirt"]),
    subtype!(
        "Blouse",
        "top",
        ["a blouse", "a lightweight blouse", "a dressy blouse"]
    ),
    subtype!("Polo", "top", ["a polo shirt", "a collared polo shirt"]),
    subtype!("Tank top", "top", ["a tank top", "a sleeveless tank top"]),
    subtype!(
        "Camisole",
        "top",
        ["a camisole", "a thin strap camisole top"]
    ),
    subtype!("Crop top", "top", ["a crop top", "a cropped shirt or top"]),
    subtype!(
        "Sweater",
        "top",
        ["a sweater", "a knitted pullover", "a knit sweater"]
    ),
    subtype!(
        "Sweatshirt",
        "top",
        ["a sweatshirt", "a crewneck sweatshirt"]
    ),
    subtype!("Hoodie", "top", ["a hoodie", "a hooded sweatshirt"]),
    subtype!(
        "Cardigan",
        "top",
        ["a cardigan", "an open-front knitted cardigan"]
    ),
    subtype!(
        "Vest",
        "top",
        ["a clothing vest", "a sleeveless vest worn as a top"]
    ),
    subtype!("Tunic", "top", ["a tunic top", "a long loose-fitting top"]),
    subtype!(
        "Bodysuit",
        "top",
        ["a bodysuit", "a fitted one-piece bodysuit worn as a top"]
    ),
    subtype!(
        "Jersey",
        "top",
        [
            "a sports jersey",
            "a football or basketball jersey",
            "an athletic team jersey"
        ]
    ),
    subtype!(
        "Jeans",
        "bottom",
        ["a pair of jeans", "denim jeans", "denim trousers"]
    ),
    subtype!(
        "Trousers",
        "bottom",
        [
            "a pair of trousers",
            "formal or casual pants",
            "non-denim trousers"
        ]
    ),
    subtype!(
        "Chinos",
        "bottom",
        ["a pair of chinos", "casual chino pants"]
    ),
    subtype!(
        "Cargo pants",
        "bottom",
        ["cargo pants", "pants with cargo pockets"]
    ),
    subtype!(
        "Joggers",
        "bottom",
        ["jogger pants", "tapered casual joggers"]
    ),
    subtype!("Sweatpants", "bottom", ["sweatpants", "casual sweat pants"]),
    subtype!("Leggings", "bottom", ["leggings", "tight fitted leggings"]),
    subtype!("Shorts", "bottom", ["a pair of shorts", "casual shorts"]),
    subtype!("Denim shorts", "bottom", ["denim shorts", "jean shorts"]),
    subtype!(
        "Cargo shorts",
        "bottom",
        ["cargo shorts", "shorts with cargo pockets"]
    ),
    subtype!(fallback "Skirt", "bottom", ["a skirt", "a standard skirt"]),
    subtype!("Mini skirt", "bottom", ["a mini skirt", "a short skirt"]),
    subtype!(
        "Midi skirt",
        "bottom",
        ["a midi skirt", "a medium length skirt"]
    ),
    subtype!(
        "Maxi skirt",
        "bottom",
        ["a maxi skirt", "a long ankle-length skirt"]
    ),
    subtype!(fallback "Dress", "dress", ["a dress", "a one-piece dress garment"]),
    subtype!("Mini dress", "dress", ["a mini dress", "a short dress"]),
    subtype!(
        "Midi dress",
        "dress",
        ["a midi dress", "a medium length dress"]
    ),
    subtype!(
        "Maxi dress",
        "dress",
        ["a maxi dress", "a long ankle-length dress"]
    ),
    subtype!(
        "Shirt dress",
        "dress",
        ["a shirt dress", "a dress styled like a button-up shirt"]
    ),
    subtype!(
        "Sweater dress",
        "dress",
        ["a sweater dress", "a knitted dress"]
    ),
    subtype!(
        "Slip dress",
        "dress",
        ["a slip dress", "a thin strap slip dress"]
    ),
    subtype!(
        "Wrap dress",
        "dress",
        ["a wrap dress", "a dress with a wrap front"]
    ),
    subtype!(
        "Bodycon dress",
        "dress",
        ["a bodycon dress", "a tight fitted dress"]
    ),
    subtype!(
        "Jumpsuit",
        "dress",
        ["a jumpsuit", "a one-piece garment with trousers"]
    ),
    subtype!(
        "Romper",
        "dress",
        ["a romper", "a one-piece garment with shorts"]
    ),
    subtype!(
        "Sneakers",
        "shoes",
        ["a pair of sneakers", "casual sneakers"]
    ),
    subtype!(
        "Running shoes",
        "shoes",
        ["running shoes", "athletic running sneakers"]
    ),
    subtype!(fallback "Boots", "shoes", ["a pair of boots", "general-purpose boots"]),
    subtype!(
        "Ankle boots",
        "shoes",
        ["ankle boots", "short boots ending near the ankle"]
    ),
    subtype!(
        "Chelsea boots",
        "shoes",
        ["Chelsea boots", "elastic-sided ankle boots"]
    ),
    subtype!(
        "Hiking boots",
        "shoes",
        ["hiking boots", "outdoor trail boots"]
    ),
    subtype!(fallback "Dress shoes", "shoes", ["formal dress shoes", "smart formal shoes"]),
    subtype!("Loafers", "shoes", ["loafers", "slip-on dress loafers"]),
    subtype!("Oxfords", "shoes", ["Oxford shoes", "lace-up formal shoes"]),
    subtype!("Sandals", "shoes", ["sandals", "open footwear with straps"]),
    subtype!("Slides", "shoes", ["slide sandals", "open slip-on slides"]),
    subtype!("Flip-flops", "shoes", ["flip-flops", "toe-post sandals"]),
    subtype!("Heels", "shoes", ["high heels", "heeled shoes"]),
    subtype!("Pumps", "shoes", ["pumps", "closed-toe high heel pumps"]),
    subtype!("Flats", "shoes", ["flat shoes", "dressy flat shoes"]),
    subtype!(
        "Ballet flats",
        "shoes",
        ["ballet flats", "flat ballet-style shoes"]
    ),
    subtype!(
        "Espadrilles",
        "shoes",
        ["espadrilles", "rope-soled espadrille shoes"]
    ),
    subtype!("Slippers", "shoes", ["slippers", "indoor house slippers"]),
    subtype!(fallback "Jacket", "outerwear", ["a jacket", "a general outerwear jacket"]),
    subtype!(
        "Denim jacket",
        "outerwear",
        ["a denim jacket", "a jean jacket"]
    ),
    subtype!("Leather jacket", "outerwear", ["a leather jacket"]),
    subtype!("Bomber jacket", "outerwear", ["a bomber jacket"]),
    subtype!(
        "Varsity jacket",
        "outerwear",
        ["a varsity jacket", "a college-style letterman jacket"]
    ),
    subtype!(
        "Harrington jacket",
        "outerwear",
        [
            "a Harrington jacket",
            "a lightweight waist-length Harrington jacket"
        ]
    ),
    subtype!(
        "Blazer",
        "outerwear",
        ["a blazer", "a tailored blazer jacket"]
    ),
    subtype!(fallback "Coat", "outerwear", ["a coat", "a general outerwear coat"]),
    subtype!(
        "Overcoat",
        "outerwear",
        ["an overcoat", "a long formal coat"]
    ),
    subtype!(
        "Trench coat",
        "outerwear",
        ["a trench coat", "a belted trench coat"]
    ),
    subtype!(
        "Peacoat",
        "outerwear",
        ["a peacoat", "a short double-breasted wool coat"]
    ),
    subtype!("Parka", "outerwear", ["a parka", "a hooded winter parka"]),
    subtype!(
        "Puffer jacket",
        "outerwear",
        [
            "a puffer jacket",
            "a quilted insulated jacket",
            "a down-style puffer jacket"
        ]
    ),
    subtype!(
        "Rain jacket",
        "outerwear",
        ["a rain jacket", "a waterproof rain shell"]
    ),
    subtype!(
        "Windbreaker",
        "outerwear",
        ["a windbreaker", "a lightweight wind jacket"]
    ),
    subtype!(
        "Fleece jacket",
        "outerwear",
        ["a fleece jacket", "a fleece outerwear jacket"]
    ),
    subtype!(
        "Gilet",
        "outerwear",
        [
            "a padded gilet",
            "a sleeveless outerwear vest",
            "a puffer vest"
        ]
    ),
    subtype!(
        "Overshirt",
        "outerwear",
        [
            "an overshirt",
            "a shirt jacket",
            "a heavy overshirt worn as outerwear"
        ]
    ),
    subtype!("Handbag", "accessory", ["a handbag", "a fashion handbag"]),
    subtype!(
        "Tote bag",
        "accessory",
        ["a tote bag", "a large open tote bag"]
    ),
    subtype!("Shoulder bag", "accessory", ["a shoulder bag"]),
    subtype!(
        "Crossbody bag",
        "accessory",
        ["a crossbody bag", "a bag with a long crossbody strap"]
    ),
    subtype!(
        "Backpack",
        "accessory",
        ["a backpack", "a fashion backpack"]
    ),
    subtype!(
        "Clutch",
        "accessory",
        ["a clutch bag", "a small handheld clutch"]
    ),
    subtype!("Wallet", "accessory", ["a wallet", "a small wallet"]),
    subtype!("Belt", "accessory", ["a belt", "a clothing belt"]),
    subtype!(fallback "Hat", "accessory", ["a hat", "a general fashion hat"]),
    subtype!(
        "Baseball cap",
        "accessory",
        ["a baseball cap", "a peaked sports cap"]
    ),
    subtype!("Beanie", "accessory", ["a beanie", "a knitted beanie hat"]),
    subtype!("Bucket hat", "accessory", ["a bucket hat"]),
    subtype!("Scarf", "accessory", ["a scarf", "a fashion neck scarf"]),
    subtype!(
        "Gloves",
        "accessory",
        ["a pair of gloves", "fashion gloves"]
    ),
    subtype!("Tie", "accessory", ["a necktie", "a formal tie"]),
    subtype!("Bow tie", "accessory", ["a bow tie"]),
    subtype!(
        "Sunglasses",
        "accessory",
        ["sunglasses", "fashion sunglasses"]
    ),
    subtype!("Glasses", "accessory", ["eyeglasses", "optical glasses"]),
    subtype!("Watch", "accessory", ["a wristwatch", "a fashion watch"]),
    subtype!("Bracelet", "accessory", ["a bracelet"]),
    subtype!("Necklace", "accessory", ["a necklace"]),
    subtype!("Ring", "accessory", ["a ring", "a jewelry ring"]),
    subtype!("Earrings", "accessory", ["earrings", "a pair of earrings"]),
];
