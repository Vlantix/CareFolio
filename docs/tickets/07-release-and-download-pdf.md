# 07 — Release and download the official PDF

**What to build:** the records office attaches the official PDF to an
approved request, which releases it. The requester opens it and
downloads it on their phone.

**Blocked by:** 06

**Status:** todo

- [ ] The documents table exists with Row Level Security on: linked
      accounts and admins read, and only admins write
- [ ] A private storage bucket holds the PDFs, which only admins can
      upload
- [ ] On the Review request screen the admin attaches a PDF, and the
      request becomes "released"
- [ ] A released request on My requests has a View button
- [ ] The Document view matches its design and shows the PDF with a
      Download button
- [ ] The file is reached only through a short-lived link, and an
      unlinked account cannot open it
- [ ] Releasing, viewing and downloading each write an audit row
- [ ] Patients and caregivers can never upload or change a document
- [ ] Database changes are saved as numbered SQL files in the repo
- [ ] Works on the live URL: the full demo runs from sign up to download
