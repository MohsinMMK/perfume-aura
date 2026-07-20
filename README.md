# Perfume Aura

Coming soon site for [perfumeaura.com](https://perfumeaura.com).

## Stack

- Static HTML + CSS (no build step)
- Deployed to Hostinger `public_html` via **official GitHub Git integration**
- Domain registered at **GoDaddy**; DNS via Hostinger nameservers

## Local preview

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Production workflow

```bash
git add .
git commit -m "Your change"
git push origin main
```

Hostinger auto-deploys `main` → `public_html`.

### One-time Hostinger Git setup

1. hPanel → Websites → **perfumeaura.com** → Dashboard  
2. **Advanced** → **Git** → Continue with GitHub  
3. Repo: `MohsinMMK/perfume-aura` · Branch: `main` · Root: `public_html`  
4. Deploy · enable auto-deployment  

## Domain (official)

| Piece | Provider |
|-------|----------|
| Registration / renewal | GoDaddy |
| Nameservers | Hostinger (`lunar.dns-parking.com`, `solar.dns-parking.com`) |
| A / CNAME / MX zone | Hostinger hPanel (not GoDaddy) |
| Hosting + SSL + Git | Hostinger |

Full details, DNS explanation, checks, and anti-patterns: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## Status notes

After nameserver changes, allow **up to 24 hours** for Hostinger validation and global DNS propagation. Do not transfer the domain or thrash nameservers during that window.
