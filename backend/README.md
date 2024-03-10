# Setup

1. Install all dependencies: `yarn`
2. Setup the infrastructure locally (requires docker): `yarn infra`
3. Start project: `yarn dev`

# Known limitations

- No CRUD for users:
    - The migration script already seeds the database with 3 users
    - An example of CRUD can already be found in the `question.router.ts` file
- Cannot scale beyond one instance
    - Designed as a monolith due to time constraint. Allowing multiple instances can be done by forwarding or synchronising events through redis or similar (e.g. use redis to propagate `question-answer` user events to other instances).
