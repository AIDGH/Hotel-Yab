# Hotel-Yab TODO

This file tracks open product and technical work for Hotel-Yab.

---

# Current Priority

## 1. Complete the Core Website

- [ ] Complete Hotel Detail Page
- [ ] Complete Notable Person Detail Page
- [ ] Improve hotel/person relationship presentation
- [ ] Improve search experience
- [ ] Improve mobile responsiveness
- [ ] Improve loading states
- [ ] Improve empty states
- [ ] Improve error states
- [ ] Final UI polish for listing and detail pages

---

# 2. Content Enrichment

## Hotel Images

- [ ] Add images for existing hotels
- [ ] Define a consistent image size and format
- [ ] Add fallback image behavior

## Notable Person Images

- [ ] Add images for existing people
- [ ] Verify that each image belongs to the correct person
- [ ] Replace low-quality images where necessary

## Person Information

- [ ] Complete Instagram handles
- [ ] Complete occupations
- [ ] Complete biographies
- [ ] Add missing follower information where needed

## Videos and Sources

- [ ] Find relevant videos for hotel-person relationships
- [ ] Store source links
- [ ] Add Instagram post/reel links where relevant
- [ ] Define how sources and videos should appear on detail pages

---

# 3. Continue Data Collection

- [ ] Add more hotels
- [ ] Add more notable people
- [ ] Add more hotel-person associations
- [ ] Review duplicate records
- [ ] Review incomplete records
- [ ] Review unverified associations
- [ ] Improve overall data quality before large-scale expansion

---

# 4. Second Spreadsheet / Clean Dataset

- [ ] Define the purpose of the second spreadsheet
- [ ] Define the final columns
- [ ] Define unique identifiers for hotels and people
- [ ] Define association structure
- [ ] Define validation rules
- [ ] Define publication fields
- [ ] Prepare existing research data for migration

Planned flow:

```text
Research Spreadsheet
        ↓
Clean Spreadsheet
        ↓
Sync Script
        ↓
PostgreSQL
        ↓
Website
```

---

# 5. Data Sync Script

- [ ] Design spreadsheet-to-database sync process
- [ ] Normalize hotel names
- [ ] Normalize person names
- [ ] Match existing database records
- [ ] Prevent duplicate hotels
- [ ] Prevent duplicate people
- [ ] Prevent duplicate associations
- [ ] Validate required fields
- [ ] Handle invalid rows
- [ ] Add dry-run mode before database writes
- [ ] Add sync summary/report
- [ ] Document how to run the sync script

---

# 6. User Accounts

This phase should start after the core website and data pipeline are stable.

- [ ] Define why users need accounts
- [ ] Design authentication flow
- [ ] Implement signup/login
- [ ] Add user profile
- [ ] Add favorite/saved hotels
- [ ] Consider saved notable people
- [ ] Consider personalized discovery
- [ ] Consider user-submitted hotel/person information

---

# 7. Admin and Moderation

Later phase:

- [ ] Define admin roles
- [ ] Create hotel management interface
- [ ] Create notable-person management interface
- [ ] Create association review interface
- [ ] Add source verification workflow
- [ ] Add publication controls
- [ ] Add moderation history

---

# 8. Technical Improvements

- [ ] Improve validation across API endpoints
- [ ] Improve API error handling
- [ ] Add automated tests
- [ ] Review database indexes
- [ ] Review performance as dataset grows
- [ ] Define production environment
- [ ] Define deployment process
- [ ] Define production media storage
- [ ] Add monitoring and logging when needed

---

# 9. Documentation

- [x] Create `ARCHITECTURE.md`
- [x] Create `DECISIONS.md`
- [x] Create `API.md`
- [x] Create `DATABASE.md`
- [x] Create `DATA_POLICY.md`
- [x] Create `CHANGELOG.md`
- [x] Create `TODO.md`

After the documentation set is complete:

- [ ] Refactor `PROJECT_CONTEXT.md`
- [ ] Remove unnecessary duplicated details
- [ ] Link each detailed document from `PROJECT_CONTEXT.md`
- [ ] Review `README.md`

---

# Suggested Execution Order

```text
1. Core Website
      ↓
2. Images and Content
      ↓
3. Videos and Sources
      ↓
4. Continue Data Collection
      ↓
5. Second Spreadsheet
      ↓
6. Sync Script
      ↓
7. User Accounts
      ↓
8. Admin / Scale
```

---

# TODO Rules

- Only open work belongs in this file.
- Completed meaningful work should move to `CHANGELOG.md`.
- Technical decisions should go to `DECISIONS.md`.
- Database changes should be documented in `DATABASE.md`.
- API changes should be documented in `API.md`.
- Data-policy changes should be documented in `DATA_POLICY.md`.