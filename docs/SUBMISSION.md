# ShopSmart: AWS Deployment Submission (Team JAM)

PDC50 Full Stack AI Application Development · 20 November 2026

| Item | Value |
| --- | --- |
| **Site URL** | https://47-130-123-197.sslip.io |
| **Repository** | https://github.com/Kishhh19/ShopSmart (`main`) |
| **Code version** | Release 1.2.0, commit `9a17af5` (docs updates after it) |
| **Release type** | **Hosted** online release (not local) |
| **AWS account plan** | Free plan, no charges; US$120 credits issued, ~US$112.92 remaining, expires 8 May 2027 |
| **Region** | ap-southeast-1 (Singapore) |
| **Services used** | EC2 (t3.micro, Amazon Linux 2023), EBS gp3 8 GiB, Elastic IP, VPC security group, S3 (private), IAM role, Systems Manager Session Manager |
| **Architecture** | Single EC2 host: Caddy (HTTPS) + Express API + PostgreSQL 16 |
| **Data** | Fictional customers only; checkout is simulated, no payment |

## Tested URLs

| URL | Expected |
| --- | --- |
| https://47-130-123-197.sslip.io/ | Home page with 6 products |
| https://47-130-123-197.sslip.io/products/2 | Direct route works on refresh |
| https://47-130-123-197.sslip.io/api/health | `{"status":"ok"}` |
| https://47-130-123-197.sslip.io/api/health/ready | `{"status":"ok","database":"ok"}` |
| https://47-130-123-197.sslip.io/api/orders/1 (signed out) | 401 `SIGN_IN_REQUIRED` |
| https://47-130-123-197.sslip.io/login | Sign-in page |
| https://47-130-123-197.sslip.io/assistant | Assistant labelled "Rule-based assistant (no live AI provider)" |

## Where each required item is

| Required by the guide | File |
| --- | --- |
| Updated project / repository | GitHub `main` (commit `9a17af5`) |
| Deployment diagram | `docs/aws_deployment_diagram.png` (also in `docs/AWS_DEPLOYMENT.md` §3) |
| Decision record for the architecture | `docs/AWS_DEPLOYMENT.md` §2 |
| Account plan, credits, resource register (service, Region, owner, purpose, dates, removal) | `docs/AWS_DEPLOYMENT.md` §1 and §4 |
| Redacted screenshots and logs | `docs/evidence/aws/` (index in `docs/AWS_DEPLOYMENT.md` §10) |
| Hosted verification results (all 8 checks) | `docs/AWS_DEPLOYMENT.md` §8 |
| Release note | `RELEASE_NOTE.md` (1.2.0 section at the top) |
| Two improvements and retests | `RELEASE_NOTE.md` "Retests" and `docs/TEAM_EXPLAINER.md` |
| Migration history and data-preservation decision | `docs/AWS_DEPLOYMENT.md` §6 |
| End of demo / cleanup plan | `docs/AWS_DEPLOYMENT.md` §9 |

## Two improvements and retests

| Improvement | Retest on the hosted version | Result |
| --- | --- | --- |
| 1. Customer sign-in with a server-side session (scrypt hashes, HttpOnly + Secure cookie, rate-limited login) | Register 201; wrong password 401; signed-out `/api/auth/me` 401; cookie HttpOnly + Secure; team member signed in through the browser (evidence 12) | Pass |
| 2. Order ownership enforced by the API | Guest 401; owner 200; another customer 403 `ORDER_FORBIDDEN` by direct API request; owner's order kept after API restart and full reboot (evidence 05, 06, 07) | Pass |

## Hosted check summary

| Check | Result |
| --- | --- |
| Frontend and direct route | Pass |
| API connection over HTTPS | Pass |
| Catalog and cart | Pass |
| Account and order ownership | Pass |
| Simulated checkout (valid saved, excess 409, invalid 422) | Pass |
| Assistant (grounded, no-match, labelled provider) | Pass |
| Restart and logs | Pass |
| Secrets and credits | Pass |
| Automated tests on host | Backend 28/28, frontend 16/16, lint clean |
