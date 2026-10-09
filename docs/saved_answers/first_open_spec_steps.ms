  Your first OpenSpec step:

  /opsx:propose m0-walking-skeleton

  It will create openspec/changes/m0-walking-skeleton/ with proposal.md, design.md, tasks.md and the delta specs. It only writes plans, no code. Then we'll go through each file together and you can edit anything
  you disagree with. After that you run /opsx:apply.

  Two things only you can set up, which M0 will need before it can deploy:
  - A GitHub repo for this project. It has no remote yet, and we agreed it should be public.
  - A free Cloudflare account, plus an API token that the GitHub Actions deploy will use.

  Doing them now saves waiting later, but /opsx:propose doesn't need either.