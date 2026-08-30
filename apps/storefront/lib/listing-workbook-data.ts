export type ListingWorkbookVariant = Readonly<{
  id: string;
  sizeMl: 30 | 50 | 100 | 105;
  priceMinor: number | null;
}>;

export type ListingWorkbookProduct = Readonly<{
  id: string;
  sourceKey: string;
  slug: string;
  name: string;
  brand: string | null;
  collectionSlug: "signature" | "inspired" | "unknown";
  image: string;
  cardImage: string;
  imageAlt: string;
  accent: "wine" | "blue" | "blush" | "brass";
  hasCampaignMedia: boolean;
  variants: readonly ListingWorkbookVariant[];
}>;

export const listingWorkbookProducts = [
  {
    "id": "main_list:1",
    "sourceKey": "main_list:1",
    "slug": "inspired-by-bvlgari-tygar",
    "name": "Inspired by Bvlgari Tygar",
    "brand": "Bvlgari",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Bvlgari Tygar",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:1:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:1:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:1:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:2",
    "sourceKey": "main_list:2",
    "slug": "inspired-by-dior-sauvage",
    "name": "Inspired by Dior Sauvage",
    "brand": "Dior",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Dior Sauvage",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:2:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:2:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:2:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:3",
    "sourceKey": "main_list:3",
    "slug": "inspired-by-louis-vuitton-afternoon-swim",
    "name": "Inspired by Louis Vuitton Afternoon Swim",
    "brand": "Louis Vuitton",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Louis Vuitton Afternoon Swim",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:3:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:3:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:3:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:4",
    "sourceKey": "main_list:4",
    "slug": "inspired-by-creed-green-irish-tweed",
    "name": "Inspired by Creed Green Irish Tweed",
    "brand": "Creed",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Creed Green Irish Tweed",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:4:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:4:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:4:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:5",
    "sourceKey": "main_list:5",
    "slug": "inspired-by-creed-aventus",
    "name": "Inspired by Creed Aventus",
    "brand": "Creed",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Creed Aventus",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:5:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:5:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:5:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:6",
    "sourceKey": "main_list:6",
    "slug": "inspired-by-rasasi-hawas-for-him",
    "name": "Inspired by Rasasi Hawas for Him",
    "brand": "Rasasi",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rasasi Hawas for Him",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:6:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:6:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:6:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:7",
    "sourceKey": "main_list:7",
    "slug": "inspired-by-roja-parfums-elysium-pour-homme",
    "name": "Inspired by Roja Parfums Elysium Pour Homme",
    "brand": "Roja Parfums",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Roja Parfums Elysium Pour Homme",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:7:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:7:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:7:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:8",
    "sourceKey": "main_list:8",
    "slug": "inspired-by-emporio-armani-stronger-with-you",
    "name": "Inspired by Emporio Armani Stronger With You",
    "brand": "Emporio Armani",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Emporio Armani Stronger With You",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:8:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:8:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:8:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:9",
    "sourceKey": "main_list:9",
    "slug": "inspired-by-gissah-hudson-valley",
    "name": "Inspired by Gissah Hudson Valley",
    "brand": "Gissah",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Gissah Hudson Valley",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:9:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:9:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:9:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:10",
    "sourceKey": "main_list:10",
    "slug": "heaven-rose",
    "name": "Heaven Rose",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Heaven Rose",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:10:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:10:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:10:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:11",
    "sourceKey": "main_list:11",
    "slug": "inspired-by-gucci-flora",
    "name": "Inspired by Gucci Flora",
    "brand": "Gucci",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Gucci Flora",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:11:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:11:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:11:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:12",
    "sourceKey": "main_list:12",
    "slug": "inspired-by-yves-saint-laurent-y",
    "name": "Inspired by Yves Saint Laurent Y",
    "brand": "Yves Saint Laurent",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Yves Saint Laurent Y",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:12:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:12:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:12:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:13",
    "sourceKey": "main_list:13",
    "slug": "rose-elegance",
    "name": "Rose Elegance",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Rose Elegance",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:13:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:13:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:13:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:14",
    "sourceKey": "main_list:14",
    "slug": "inspired-by-xerjoff-alexandria-ii",
    "name": "Inspired by Xerjoff Alexandria II",
    "brand": "Xerjoff",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Xerjoff Alexandria II",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:14:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:14:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:14:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:15",
    "sourceKey": "main_list:15",
    "slug": "inspired-by-ajmal-aurum",
    "name": "Inspired by Ajmal Aurum",
    "brand": "Ajmal",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Ajmal Aurum",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:15:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:15:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:15:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:16",
    "sourceKey": "main_list:16",
    "slug": "inspired-by-nasomatto-black-afgano",
    "name": "Inspired by Nasomatto Black Afgano",
    "brand": "Nasomatto",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Nasomatto Black Afgano",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:16:30",
        "sizeMl": 30,
        "priceMinor": 60000
      },
      {
        "id": "main_list:16:50",
        "sizeMl": 50,
        "priceMinor": 80000
      },
      {
        "id": "main_list:16:100",
        "sizeMl": 100,
        "priceMinor": 140000
      }
    ]
  },
  {
    "id": "main_list:17",
    "sourceKey": "main_list:17",
    "slug": "inspired-by-giorgio-armani-acqua-di-gio",
    "name": "Inspired by Giorgio Armani Acqua di Giò",
    "brand": "Giorgio Armani",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Giorgio Armani Acqua di Giò",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:17:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:17:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:17:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:18",
    "sourceKey": "main_list:18",
    "slug": "inspired-by-azzaro-chrome",
    "name": "Inspired by Azzaro Chrome",
    "brand": "Azzaro",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Azzaro Chrome",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:18:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:18:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:18:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:19",
    "sourceKey": "main_list:19",
    "slug": "inspired-by-versace-pour-homme",
    "name": "Inspired by Versace Pour Homme",
    "brand": "Versace",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Versace Pour Homme",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:19:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:19:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:19:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:20",
    "sourceKey": "main_list:20",
    "slug": "hugo-boss",
    "name": "Hugo Boss",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Hugo Boss",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:20:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:20:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:20:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:21",
    "sourceKey": "main_list:21",
    "slug": "inspired-by-ralph-lauren-polo-sport",
    "name": "Inspired by Ralph Lauren Polo Sport",
    "brand": "Ralph Lauren",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Ralph Lauren Polo Sport",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:21:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:21:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:21:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:22",
    "sourceKey": "main_list:22",
    "slug": "inspired-by-chanel-bleu-de-chanel",
    "name": "Inspired by Chanel Bleu de Chanel",
    "brand": "Chanel",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Chanel Bleu de Chanel",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:22:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:22:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:22:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:23",
    "sourceKey": "main_list:23",
    "slug": "inspired-by-prada-luna-rossa",
    "name": "Inspired by Prada Luna Rossa",
    "brand": "Prada",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Prada Luna Rossa",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:23:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:23:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:23:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:24",
    "sourceKey": "main_list:24",
    "slug": "inspired-by-calvin-klein-ck-one",
    "name": "Inspired by Calvin Klein CK One",
    "brand": "Calvin Klein",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Calvin Klein CK One",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:24:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:24:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:24:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:25",
    "sourceKey": "main_list:25",
    "slug": "inspired-by-al-rehab-blue",
    "name": "Inspired by Al-Rehab Blue",
    "brand": "Al-Rehab",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Al-Rehab Blue",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:25:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:25:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:25:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:26",
    "sourceKey": "main_list:26",
    "slug": "inspired-by-rasasi-hawas-ice",
    "name": "Inspired by Rasasi Hawas Ice",
    "brand": "Rasasi",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rasasi Hawas Ice",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:26:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:26:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:26:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:27",
    "sourceKey": "main_list:27",
    "slug": "inspired-by-bvlgari-aqva-pour-homme",
    "name": "Inspired by Bvlgari Aqva Pour Homme",
    "brand": "Bvlgari",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Bvlgari Aqva Pour Homme",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:27:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:27:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:27:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:28",
    "sourceKey": "main_list:28",
    "slug": "inspired-by-ralph-lauren-polo-blue",
    "name": "Inspired by Ralph Lauren Polo Blue",
    "brand": "Ralph Lauren",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Ralph Lauren Polo Blue",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:28:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:28:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:28:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:29",
    "sourceKey": "main_list:29",
    "slug": "inspired-by-davidoff-cool-water-woman",
    "name": "Inspired by Davidoff Cool Water Woman",
    "brand": "Davidoff",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Davidoff Cool Water Woman",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:29:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:29:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:29:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:30",
    "sourceKey": "main_list:30",
    "slug": "inspired-by-davidoff-cool-water",
    "name": "Inspired by Davidoff Cool Water",
    "brand": "Davidoff",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Davidoff Cool Water",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:30:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:30:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:30:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:31",
    "sourceKey": "main_list:31",
    "slug": "inspired-by-versace-bright-crystal",
    "name": "Inspired by Versace Bright Crystal",
    "brand": "Versace",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Versace Bright Crystal",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:31:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:31:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:31:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:32",
    "sourceKey": "main_list:32",
    "slug": "inspired-by-cristiano-ronaldo-cr7",
    "name": "Inspired by Cristiano Ronaldo CR7",
    "brand": "Cristiano Ronaldo",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Cristiano Ronaldo CR7",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:32:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:32:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:32:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:33",
    "sourceKey": "main_list:33",
    "slug": "inspired-by-dunhill-icon",
    "name": "Inspired by Dunhill Icon",
    "brand": "Dunhill",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Dunhill Icon",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:33:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:33:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:33:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:34",
    "sourceKey": "main_list:34",
    "slug": "inspired-by-diptyque-tam-dao",
    "name": "Inspired by Diptyque Tam Dao",
    "brand": "Diptyque",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Diptyque Tam Dao",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:34:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:34:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:34:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:35",
    "sourceKey": "main_list:35",
    "slug": "inspired-by-rabanne-1-million-lucky",
    "name": "Inspired by Rabanne 1 Million Lucky",
    "brand": "Rabanne",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rabanne 1 Million Lucky",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:35:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:35:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:35:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:36",
    "sourceKey": "main_list:36",
    "slug": "inspired-by-carolina-herrera-212-men",
    "name": "Inspired by Carolina Herrera 212 Men",
    "brand": "Carolina Herrera",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Carolina Herrera 212 Men",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:36:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:36:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:36:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:37",
    "sourceKey": "main_list:37",
    "slug": "inspired-by-carolina-herrera-212-vip-men",
    "name": "Inspired by Carolina Herrera 212 VIP Men",
    "brand": "Carolina Herrera",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Carolina Herrera 212 VIP Men",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:37:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:37:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:37:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:38",
    "sourceKey": "main_list:38",
    "slug": "inspired-by-azzaro-the-most-wanted",
    "name": "Inspired by Azzaro The Most Wanted",
    "brand": "Azzaro",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Azzaro The Most Wanted",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:38:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:38:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:38:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:39",
    "sourceKey": "main_list:39",
    "slug": "inspired-by-jean-paul-gaultier-scandal",
    "name": "Inspired by Jean Paul Gaultier Scandal",
    "brand": "Jean Paul Gaultier",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Jean Paul Gaultier Scandal",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:39:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:39:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:39:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:40",
    "sourceKey": "main_list:40",
    "slug": "inspired-by-tom-ford-oud-wood",
    "name": "Inspired by Tom Ford Oud Wood",
    "brand": "Tom Ford",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Tom Ford Oud Wood",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:40:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:40:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:40:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:41",
    "sourceKey": "main_list:41",
    "slug": "inspired-by-jimmy-choo-i-want-choo",
    "name": "Inspired by Jimmy Choo I Want Choo",
    "brand": "Jimmy Choo",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Jimmy Choo I Want Choo",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:41:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:41:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:41:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:42",
    "sourceKey": "main_list:42",
    "slug": "inspired-by-burberry-her",
    "name": "Inspired by Burberry Her",
    "brand": "Burberry",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Burberry Her",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:42:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:42:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:42:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:43",
    "sourceKey": "main_list:43",
    "slug": "inspired-by-rabanne-1-million",
    "name": "Inspired by Rabanne 1 Million",
    "brand": "Rabanne",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rabanne 1 Million",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:43:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:43:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:43:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:44",
    "sourceKey": "main_list:44",
    "slug": "inspired-by-giorgio-armani-si-passione",
    "name": "Inspired by Giorgio Armani Sì Passione",
    "brand": "Giorgio Armani",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Giorgio Armani Sì Passione",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:44:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:44:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:44:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:45",
    "sourceKey": "main_list:45",
    "slug": "inspired-by-ralph-lauren-polo-sport-woman",
    "name": "Inspired by Ralph Lauren Polo Sport Woman",
    "brand": "Ralph Lauren",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Ralph Lauren Polo Sport Woman",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:45:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:45:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:45:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:46",
    "sourceKey": "main_list:46",
    "slug": "inspired-by-jean-paul-gaultier-ultra-male",
    "name": "Inspired by Jean Paul Gaultier Ultra Male",
    "brand": "Jean Paul Gaultier",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Jean Paul Gaultier Ultra Male",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:46:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:46:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:46:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:47",
    "sourceKey": "main_list:47",
    "slug": "inspired-by-gucci-bloom",
    "name": "Inspired by Gucci Bloom",
    "brand": "Gucci",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Gucci Bloom",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:47:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:47:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:47:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:48",
    "sourceKey": "main_list:48",
    "slug": "inspired-by-viktor-rolf-flowerbomb",
    "name": "Inspired by Viktor&Rolf Flowerbomb",
    "brand": "Viktor&Rolf",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Viktor&Rolf Flowerbomb",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:48:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:48:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:48:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:49",
    "sourceKey": "main_list:49",
    "slug": "inspired-by-chanel-coco",
    "name": "Inspired by Chanel Coco",
    "brand": "Chanel",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Chanel Coco",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:49:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:49:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:49:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:50",
    "sourceKey": "main_list:50",
    "slug": "inspired-by-rabanne-invictus",
    "name": "Inspired by Rabanne Invictus",
    "brand": "Rabanne",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rabanne Invictus",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:50:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:50:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:50:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:51",
    "sourceKey": "main_list:51",
    "slug": "inspired-by-yves-saint-laurent-libre",
    "name": "Inspired by Yves Saint Laurent Libre",
    "brand": "Yves Saint Laurent",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Yves Saint Laurent Libre",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:51:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:51:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:51:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:52",
    "sourceKey": "main_list:52",
    "slug": "inspired-by-xerjoff-erba-pura",
    "name": "Inspired by Xerjoff Erba Pura",
    "brand": "Xerjoff",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Xerjoff Erba Pura",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:52:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:52:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:52:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:53",
    "sourceKey": "main_list:53",
    "slug": "inspired-by-armaf-club-de-nuit",
    "name": "Inspired by Armaf Club de Nuit",
    "brand": "Armaf",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Armaf Club de Nuit",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:53:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:53:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:53:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:54",
    "sourceKey": "main_list:54",
    "slug": "inspired-by-maison-francis-kurkdjian-baccarat-rouge-540",
    "name": "Inspired by Maison Francis Kurkdjian Baccarat Rouge 540",
    "brand": "Maison Francis Kurkdjian",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Maison Francis Kurkdjian Baccarat Rouge 540",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:54:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:54:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:54:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:55",
    "sourceKey": "main_list:55",
    "slug": "inspired-by-louis-vuitton-ombre-nomade",
    "name": "Inspired by Louis Vuitton Ombre Nomade",
    "brand": "Louis Vuitton",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Louis Vuitton Ombre Nomade",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:55:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:55:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:55:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:56",
    "sourceKey": "main_list:56",
    "slug": "inspired-by-prada-candy",
    "name": "Inspired by Prada Candy",
    "brand": "Prada",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Prada Candy",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:56:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:56:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:56:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:57",
    "sourceKey": "main_list:57",
    "slug": "inspired-by-tom-ford-black-orchid",
    "name": "Inspired by Tom Ford Black Orchid",
    "brand": "Tom Ford",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Tom Ford Black Orchid",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:57:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:57:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:57:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:58",
    "sourceKey": "main_list:58",
    "slug": "inspired-by-dior-homme-intense",
    "name": "Inspired by Dior Homme Intense",
    "brand": "Dior",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Dior Homme Intense",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:58:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:58:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:58:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:59",
    "sourceKey": "main_list:59",
    "slug": "inspired-by-parfums-de-marly-delina",
    "name": "Inspired by Parfums de Marly Delina",
    "brand": "Parfums de Marly",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Parfums de Marly Delina",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:59:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:59:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:59:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:60",
    "sourceKey": "main_list:60",
    "slug": "inspired-by-al-rehab-choco-musk",
    "name": "Inspired by Al-Rehab Choco Musk",
    "brand": "Al-Rehab",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Al-Rehab Choco Musk",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:60:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:60:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:60:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:61",
    "sourceKey": "main_list:61",
    "slug": "inspired-by-rabanne-1-million-elixir",
    "name": "Inspired by Rabanne 1 Million Elixir",
    "brand": "Rabanne",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rabanne 1 Million Elixir",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:61:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:61:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:61:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:62",
    "sourceKey": "main_list:62",
    "slug": "inspired-by-narciso-rodriguez-for-her",
    "name": "Inspired by Narciso Rodriguez for Her",
    "brand": "Narciso Rodriguez",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Narciso Rodriguez for Her",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:62:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:62:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:62:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:63",
    "sourceKey": "main_list:63",
    "slug": "inspired-by-carolina-herrera-good-girl",
    "name": "Inspired by Carolina Herrera Good Girl",
    "brand": "Carolina Herrera",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Carolina Herrera Good Girl",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:63:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:63:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:63:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:64",
    "sourceKey": "main_list:64",
    "slug": "inspired-by-yves-saint-laurent-black-opium",
    "name": "Inspired by Yves Saint Laurent Black Opium",
    "brand": "Yves Saint Laurent",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Yves Saint Laurent Black Opium",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:64:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:64:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:64:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:65",
    "sourceKey": "main_list:65",
    "slug": "inspired-by-burberry-weekend",
    "name": "Inspired by Burberry Weekend",
    "brand": "Burberry",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Burberry Weekend",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:65:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:65:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:65:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:66",
    "sourceKey": "main_list:66",
    "slug": "inspired-by-hermes-terre-dhermes",
    "name": "Inspired by Hermès Terre d'Hermès",
    "brand": "Hermès",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Hermès Terre d'Hermès",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:66:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:66:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:66:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:67",
    "sourceKey": "main_list:67",
    "slug": "inspired-by-tom-ford-tobacco-vanille",
    "name": "Inspired by Tom Ford Tobacco Vanille",
    "brand": "Tom Ford",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Tom Ford Tobacco Vanille",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:67:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:67:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:67:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:68",
    "sourceKey": "main_list:68",
    "slug": "inspired-by-victorias-secret-bombshell",
    "name": "Inspired by Victoria's Secret Bombshell",
    "brand": "Victoria's Secret",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Victoria's Secret Bombshell",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:68:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:68:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:68:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:69",
    "sourceKey": "main_list:69",
    "slug": "inspired-by-bvlgari-man-in-black",
    "name": "Inspired by Bvlgari Man in Black",
    "brand": "Bvlgari",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Bvlgari Man in Black",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:69:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:69:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:69:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:70",
    "sourceKey": "main_list:70",
    "slug": "inspired-by-versace-dylan-blue-pour-homme",
    "name": "Inspired by Versace Dylan Blue Pour Homme",
    "brand": "Versace",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Versace Dylan Blue Pour Homme",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:70:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:70:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:70:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:71",
    "sourceKey": "main_list:71",
    "slug": "inspired-by-tom-ford-ombre-leather",
    "name": "Inspired by Tom Ford Ombré Leather",
    "brand": "Tom Ford",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Tom Ford Ombré Leather",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:71:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:71:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:71:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:72",
    "sourceKey": "main_list:72",
    "slug": "oud-of-aura",
    "name": "Oud of Aura",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Oud of Aura",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:72:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:72:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:72:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:73",
    "sourceKey": "main_list:73",
    "slug": "arabian-oud",
    "name": "Arabian Oud",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Arabian Oud",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:73:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:73:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:73:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:74",
    "sourceKey": "main_list:74",
    "slug": "inspired-by-calvin-klein-escape",
    "name": "Inspired by Calvin Klein Escape",
    "brand": "Calvin Klein",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Calvin Klein Escape",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:74:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:74:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:74:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:75",
    "sourceKey": "main_list:75",
    "slug": "leather-noir",
    "name": "Leather Noir",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Leather Noir",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:75:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:75:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:75:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:76",
    "sourceKey": "main_list:76",
    "slug": "amber-al-oud",
    "name": "Amber Al Oud",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Amber Al Oud",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:76:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:76:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:76:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:77",
    "sourceKey": "main_list:77",
    "slug": "inspired-by-dior-purple-oud",
    "name": "Inspired by Dior Purple Oud",
    "brand": "Dior",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Dior Purple Oud",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:77:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:77:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:77:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:78",
    "sourceKey": "main_list:78",
    "slug": "inspired-by-gucci-guilty",
    "name": "Inspired by Gucci Guilty",
    "brand": "Gucci",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Gucci Guilty",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:78:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:78:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:78:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:79",
    "sourceKey": "main_list:79",
    "slug": "inspired-by-lattafa-yara-candy",
    "name": "Inspired by Lattafa Yara Candy",
    "brand": "Lattafa",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Lattafa Yara Candy",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:79:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:79:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:79:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:80",
    "sourceKey": "main_list:80",
    "slug": "inspired-by-lattafa-khamrah",
    "name": "Inspired by Lattafa Khamrah",
    "brand": "Lattafa",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Lattafa Khamrah",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:80:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:80:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:80:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:81",
    "sourceKey": "main_list:81",
    "slug": "white-oud",
    "name": "White Oud",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for White Oud",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:81:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:81:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:81:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:82",
    "sourceKey": "main_list:82",
    "slug": "candy-oud",
    "name": "Candy Oud",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Candy Oud",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:82:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:82:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:82:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:83",
    "sourceKey": "main_list:83",
    "slug": "coffee",
    "name": "Coffee",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Coffee",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:83:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:83:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:83:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:84",
    "sourceKey": "main_list:84",
    "slug": "inspired-by-ajmal-wisal",
    "name": "Inspired by Ajmal Wisal",
    "brand": "Ajmal",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Ajmal Wisal",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:84:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:84:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:84:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:85",
    "sourceKey": "main_list:85",
    "slug": "oud-mumtaz",
    "name": "Oud Mumtaz",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Oud Mumtaz",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:85:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:85:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:85:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:86",
    "sourceKey": "main_list:86",
    "slug": "inspired-by-lattafa-khamrah-qahwa",
    "name": "Inspired by Lattafa Khamrah Qahwa",
    "brand": "Lattafa",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Lattafa Khamrah Qahwa",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:86:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:86:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:86:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:87",
    "sourceKey": "main_list:87",
    "slug": "inspired-by-cristiano-ronaldo-cr7-sport",
    "name": "Inspired by Cristiano Ronaldo CR7 Sport",
    "brand": "Cristiano Ronaldo",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Cristiano Ronaldo CR7 Sport",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:87:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:87:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:87:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:88",
    "sourceKey": "main_list:88",
    "slug": "fawake",
    "name": "Fawake",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Fawake",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:88:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:88:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:88:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:89",
    "sourceKey": "main_list:89",
    "slug": "inspired-by-rasasi-daarej-pour-homme",
    "name": "Inspired by Rasasi Daarej Pour Homme",
    "brand": "Rasasi",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rasasi Daarej Pour Homme",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:89:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:89:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:89:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:90",
    "sourceKey": "main_list:90",
    "slug": "mysore-sandal",
    "name": "Mysore Sandal",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Mysore Sandal",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:90:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:90:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:90:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:91",
    "sourceKey": "main_list:91",
    "slug": "inspired-by-al-rehab-sabaya",
    "name": "Inspired by Al-Rehab Sabaya",
    "brand": "Al-Rehab",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Al-Rehab Sabaya",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:91:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:91:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:91:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:92",
    "sourceKey": "main_list:92",
    "slug": "oud-saffron",
    "name": "Oud Saffron",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Oud Saffron",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:92:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:92:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:92:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:93",
    "sourceKey": "main_list:93",
    "slug": "areen-al-oud",
    "name": "Areen Al Oud",
    "brand": null,
    "collectionSlug": "unknown",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Areen Al Oud",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:93:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:93:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:93:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "main_list:94",
    "sourceKey": "main_list:94",
    "slug": "inspired-by-gissah-imperial-valley",
    "name": "Inspired by Gissah Imperial Valley",
    "brand": "Gissah",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Gissah Imperial Valley",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "main_list:94:30",
        "sizeMl": 30,
        "priceMinor": 45000
      },
      {
        "id": "main_list:94:50",
        "sizeMl": 50,
        "priceMinor": 65000
      },
      {
        "id": "main_list:94:100",
        "sizeMl": 100,
        "priceMinor": 120000
      }
    ]
  },
  {
    "id": "signature_series:1",
    "sourceKey": "signature_series:1",
    "slug": "regent-noir",
    "name": "Regent Noir",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/regent-noir-50ml.webp",
    "cardImage": "/images/regent-noir-flat.webp",
    "imageAlt": "Perfume Aura Regent Noir 50 ml campaign bottle",
    "accent": "wine",
    "hasCampaignMedia": true,
    "variants": [
      {
        "id": "signature_series:1:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:1:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:2",
    "sourceKey": "signature_series:2",
    "slug": "velour-venom",
    "name": "Velour Venom",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Velour Venom",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:2:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:2:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:3",
    "sourceKey": "signature_series:3",
    "slug": "serpent-noir",
    "name": "Serpent Noir",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Serpent Noir",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:3:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:3:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:4",
    "sourceKey": "signature_series:4",
    "slug": "kingdom-elixir",
    "name": "Kingdom Elixir",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Kingdom Elixir",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:4:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:4:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:5",
    "sourceKey": "signature_series:5",
    "slug": "azure-tides",
    "name": "Azure Tides",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/azure-tides-50ml.webp",
    "cardImage": "/images/azure-tides-flat.webp",
    "imageAlt": "Perfume Aura Azure Tides 50 ml campaign bottle",
    "accent": "blue",
    "hasCampaignMedia": true,
    "variants": [
      {
        "id": "signature_series:5:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:5:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:6",
    "sourceKey": "signature_series:6",
    "slug": "crimson-elixir",
    "name": "Crimson Elixir",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Crimson Elixir",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:6:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:6:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:7",
    "sourceKey": "signature_series:7",
    "slug": "eternal-athena",
    "name": "Eternal Athena",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Eternal Athena",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:7:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:7:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:8",
    "sourceKey": "signature_series:8",
    "slug": "blush-petal",
    "name": "Blush Petal",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Blush Petal",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:8:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:8:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:9",
    "sourceKey": "signature_series:9",
    "slug": "sahara-bloom",
    "name": "Sahara Bloom",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Sahara Bloom",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:9:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:9:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:10",
    "sourceKey": "signature_series:10",
    "slug": "zayan-prestige",
    "name": "Zayan Prestige",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Zayan Prestige",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:10:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:10:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:11",
    "sourceKey": "signature_series:11",
    "slug": "smoked-crimson",
    "name": "Smoked Crimson",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Smoked Crimson",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:11:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:11:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:12",
    "sourceKey": "signature_series:12",
    "slug": "desert-crown-oud",
    "name": "Desert Crown Oud",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Desert Crown Oud",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:12:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:12:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:13",
    "sourceKey": "signature_series:13",
    "slug": "oud-of-dubai",
    "name": "Oud of Dubai",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Oud of Dubai",
    "accent": "brass",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:13:50",
        "sizeMl": 50,
        "priceMinor": 180000
      },
      {
        "id": "signature_series:13:105",
        "sizeMl": 105,
        "priceMinor": 300000
      }
    ]
  },
  {
    "id": "signature_series:14",
    "sourceKey": "signature_series:14",
    "slug": "royal-stabler",
    "name": "Royal Stabler",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Royal Stabler",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:14:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:14:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:15",
    "sourceKey": "signature_series:15",
    "slug": "velvet-petal",
    "name": "Velvet Petal",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Velvet Petal",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:15:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:15:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:16",
    "sourceKey": "signature_series:16",
    "slug": "rouge-lumina",
    "name": "Rouge Lumina",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Rouge Lumina",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:16:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:16:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:17",
    "sourceKey": "signature_series:17",
    "slug": "petalia-noir",
    "name": "Petalia Noir",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/petalia-noir-50ml.webp",
    "cardImage": "/images/petalia-noir-flat.webp",
    "imageAlt": "Perfume Aura Petalia Noir 50 ml campaign bottle",
    "accent": "blush",
    "hasCampaignMedia": true,
    "variants": [
      {
        "id": "signature_series:17:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:17:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:18",
    "sourceKey": "signature_series:18",
    "slug": "rose-valeria",
    "name": "Rose Valeria",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Rose Valeria",
    "accent": "blue",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:18:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:18:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:19",
    "sourceKey": "signature_series:19",
    "slug": "celestial-ember",
    "name": "Celestial Ember",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Celestial Ember",
    "accent": "wine",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:19:50",
        "sizeMl": 50,
        "priceMinor": 120000
      },
      {
        "id": "signature_series:19:105",
        "sizeMl": 105,
        "priceMinor": 220000
      }
    ]
  },
  {
    "id": "signature_series:20",
    "sourceKey": "signature_series:20",
    "slug": "visionnaire",
    "name": "Visionnaire",
    "brand": null,
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Visionnaire",
    "accent": "blush",
    "hasCampaignMedia": false,
    "variants": [
      {
        "id": "signature_series:20:50",
        "sizeMl": 50,
        "priceMinor": 180000
      },
      {
        "id": "signature_series:20:105",
        "sizeMl": 105,
        "priceMinor": 300000
      }
    ]
  }
] as const satisfies readonly ListingWorkbookProduct[];
