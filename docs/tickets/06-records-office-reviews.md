# 06 — Records office reviews requests

**What to build:** the records office sees every request in a queue,
opens one, and approves or declines it. The requester sees the decision.

**Blocked by:** 05

**Status:** todo

- [ ] Admins land on the Request queue after logging in, and
      non-admins can never reach the admin screens
- [ ] The Request queue matches its design, newest first, filterable by
      status
- [ ] The Review request screen matches its design and shows who asked,
      for which patient, which test and why
- [ ] Declining requires a reason, and the requester sees that reason
      on My requests
- [ ] Approving changes the status, and the requester sees it
- [ ] Each decision writes an audit row
- [ ] Works on the live URL
