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
  collectionSlug: "signature" | "inspired";
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Dior Sauvage",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Louis Vuitton Afternoon Swim",
    "accent": "blue",
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
    "id": "main_list:5",
    "sourceKey": "main_list:5",
    "slug": "inspired-by-creed-aventus",
    "name": "Inspired by Creed Aventus",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rasasi Hawas for Him",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Roja Parfums Elysium Pour Homme",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Emporio Armani Stronger With You",
    "accent": "brass",
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
    "id": "main_list:14",
    "sourceKey": "main_list:14",
    "slug": "inspired-by-xerjoff-alexandria-ii",
    "name": "Inspired by Xerjoff Alexandria II",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Xerjoff Alexandria II",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Ajmal Aurum",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Nasomatto Black Afgano",
    "accent": "wine",
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
    "id": "main_list:33",
    "sourceKey": "main_list:33",
    "slug": "inspired-by-dunhill-icon",
    "name": "Inspired by Dunhill Icon",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Diptyque Tam Dao",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rabanne 1 Million Lucky",
    "accent": "brass",
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
    "id": "main_list:37",
    "sourceKey": "main_list:37",
    "slug": "inspired-by-carolina-herrera-212-vip-men",
    "name": "Inspired by Carolina Herrera 212 VIP Men",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Carolina Herrera 212 VIP Men",
    "accent": "blush",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Azzaro The Most Wanted",
    "accent": "brass",
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
    "id": "main_list:40",
    "sourceKey": "main_list:40",
    "slug": "inspired-by-tom-ford-oud-wood",
    "name": "Inspired by Tom Ford Oud Wood",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Tom Ford Oud Wood",
    "accent": "wine",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Burberry Her",
    "accent": "blush",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rabanne 1 Million",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Giorgio Armani Sì Passione",
    "accent": "brass",
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
    "id": "main_list:46",
    "sourceKey": "main_list:46",
    "slug": "inspired-by-jean-paul-gaultier-ultra-male",
    "name": "Inspired by Jean Paul Gaultier Ultra Male",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Jean Paul Gaultier Ultra Male",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Gucci Bloom",
    "accent": "blush",
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
    "id": "main_list:50",
    "sourceKey": "main_list:50",
    "slug": "inspired-by-rabanne-invictus",
    "name": "Inspired by Rabanne Invictus",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Rabanne Invictus",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Yves Saint Laurent Libre",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Xerjoff Erba Pura",
    "accent": "brass",
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
    "id": "main_list:55",
    "sourceKey": "main_list:55",
    "slug": "inspired-by-louis-vuitton-ombre-nomade",
    "name": "Inspired by Louis Vuitton Ombre Nomade",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Tom Ford Black Orchid",
    "accent": "wine",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Dior Homme Intense",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Parfums de Marly Delina",
    "accent": "blush",
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
    "id": "main_list:61",
    "sourceKey": "main_list:61",
    "slug": "inspired-by-rabanne-1-million-elixir",
    "name": "Inspired by Rabanne 1 Million Elixir",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Narciso Rodriguez for Her",
    "accent": "blush",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Carolina Herrera Good Girl",
    "accent": "blush",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Yves Saint Laurent Black Opium",
    "accent": "wine",
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
    "id": "main_list:66",
    "sourceKey": "main_list:66",
    "slug": "inspired-by-hermes-terre-dhermes",
    "name": "Inspired by Hermès Terre d'Hermès",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Hermès Terre d'Hermès",
    "accent": "blush",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Victoria's Secret Bombshell",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Bvlgari Man in Black",
    "accent": "wine",
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
    "id": "main_list:71",
    "sourceKey": "main_list:71",
    "slug": "inspired-by-tom-ford-ombre-leather",
    "name": "Inspired by Tom Ford Ombré Leather",
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
    "id": "main_list:78",
    "sourceKey": "main_list:78",
    "slug": "inspired-by-gucci-guilty",
    "name": "Inspired by Gucci Guilty",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Gucci Guilty",
    "accent": "brass",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Lattafa Yara Candy",
    "accent": "blush",
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
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Lattafa Khamrah",
    "accent": "brass",
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
    "id": "main_list:84",
    "sourceKey": "main_list:84",
    "slug": "inspired-by-ajmal-wisal",
    "name": "Inspired by Ajmal Wisal",
    "collectionSlug": "inspired",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Inspired by Ajmal Wisal",
    "accent": "brass",
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
    "id": "signature_series:1",
    "sourceKey": "signature_series:1",
    "slug": "regent-noir",
    "name": "Regent Noir",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Velour Venom",
    "accent": "brass",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Kingdom Elixir",
    "accent": "brass",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Crimson Elixir",
    "accent": "wine",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Eternal Athena",
    "accent": "brass",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Sahara Bloom",
    "accent": "blush",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Zayan Prestige",
    "accent": "brass",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Desert Crown Oud",
    "accent": "wine",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Oud of Dubai",
    "accent": "wine",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Royal Stabler",
    "accent": "wine",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Velvet Petal",
    "accent": "blush",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Rouge Lumina",
    "accent": "brass",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Rose Valeria",
    "accent": "blush",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Celestial Ember",
    "accent": "brass",
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
    "collectionSlug": "signature",
    "image": "/images/bottle-50ml.webp",
    "cardImage": "/images/bottle-50ml.webp",
    "imageAlt": "Perfume Aura house bottle for Visionnaire",
    "accent": "brass",
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
