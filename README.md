# Sendcloud fullstack test

In this test, we would like you to build a feature that allows a user to schedule a shipment to be sent later. This consists of:

1. A frontend form to schedule a shipment
2. A backend service that stores the scheduled shipment and calls a webhook when it is due

## Note about AI tools

We are looking for thoughtful engineers who understand the pros and cons of AI, not prompt engineers.

Using AI to enhance your workflow is fine; using AI to generate the test solution is not.

## Installing and running the test code

The frontend lives in the `frontend/` folder and uses a basic development setup with `vite` and `vitest`. Feel free to add to it or adapt it as needed.

We would like you to build the backend yourself in the `backend/` folder, using Docker and Python (see the backend requirements below).

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or above), for the frontend
- `npm` (v10 or above; comes with Node.js by default)
- [Python](https://www.python.org/) (3.13 or above), for the backend
- [Docker](https://www.docker.com/), to build and run the backend

You will also need a (free) [Figma](https://figma.com) account to view the design.

If you have any issues with running the project, please contact us as soon as possible.

### Commands

The frontend commands all run from the `frontend/` folder, so start with `cd frontend`.

To install, run `npm install`.

To run a local development environment, run `npm start`. Visit <http://localhost:5173> to view the frontend.

To build a version for production, run `npm run build`.

To serve the production build locally, run `npm run preview`.

To run tests, run `npm t` or `npm run test`.

To read the API docs, run `npm run api-docs`. They will be available at <http://localhost:4000>.

### The API contract

There is an OpenAPI specification for the endpoints your backend must implement in the `/api` folder. Please don't modify anything in that folder. You can view it in your browser by running `npm run api-docs` from the `frontend/` folder.

## How to complete the test

Using [this Figma design](https://www.figma.com/design/6MlvYL85pUHzam1S4is7Ng/Sendcloud-frontend-take-home-test?node-id=0-1&t=KUo1SiV4S6Y1NsRQ-1), build a form to schedule a new shipment. The password for the Figma design is `nacre-table-spout-prune`.

You also need to build the backend that receives the data. The OpenAPI specification in the `/api` folder shows you the shape of the request and the responses.

Note that the design we've provided is not perfect. You can either improve any issues you find, or document them.

Ensure that you structure your work into multiple commits, so we can see the way you work.

### Context

Please work under the following assumptions:

- Consider modern browsers only (latest 2 versions of Chrome, Firefox, and Safari)
- The frontend must be as performant and accessible (think [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)) as possible.
- The target audience will be using 3G connections and slower devices to view the page.
- If in doubt, try to keep your solution simple.
- Consider happy and unhappy user paths
- The solution should be production-ready - whatever that means to you
- We prefer a polished, but unfinished solution over a rushed, but complete one.
  - Feel free to document what you would have added with more time, and submit the document with your solution.
  - If you think of possible improvements that you think are out of scope but might be interesting, feel free to document those too.

### Requirements for the form

- The form should `POST` its data to your backend's `POST /shipments` (see the OpenAPI spec in the `/api` folder for information on what this endpoint accepts).
- As well as the shipment details, the user should be able to choose when the shipment will be sent, as a number of hours, minutes, and seconds from now. This scheduling control is not in the Figma design, so please design it yourself with usability and consistency in mind.
- On successfully sending the data, the form should be cleared and a success message shown (design not provided).
- The Country field should display this list of countries:
  - The Netherlands
  - France
  - Germany
  - Portugal
  - Spain
  - Italy
  - United Kingdom
  - United States of America
- The Export reason should display this list of export reasons:
  - Commercial goods
  - Gift
  - Documents
- The Customs information section of the design should only be shown if the selected country is one of the following:
  - United Kingdom
  - United States of America

The request also includes a `webhook_url` (see the spec). This is not something the user should fill in; send a fixed value your app is configured with.

### Requirements for how you work (frontend)

- Implement the design for the form in `frontend/src/index.html`. Please make it fully responsive (360px is the minimum viewport width you need to support)
- Document or resolve any issues in the design.
- If you make design decisions yourself, keep usability best practices in mind.
- Tests are mandatory. The frontend is set up with `vitest`; add sensible tests for the important parts and run them with `npm test`.
- Use whatever technologies or tools you feel are necessary.
  - Note: We expect this to be written in vanilla Javascript or Typescript, without using frameworks (i.e. React, Vue, Angular, etc). If you would like to use one, you can - but be prepared to make the case for it in your technical interview.

### Requirements for the backend

Build the service that receives the scheduled shipment and fires a webhook when the timer expires. Put your code in the `backend/` folder, structured however you like. The full request and response shapes are in the OpenAPI spec in the `/api` folder; the notes below cover the behaviour.

- Implement two endpoints:
  - `POST /shipments` stores the shipment and its schedule, starts a timer, and responds with the shipment `id` and the number of seconds left until it expires.
  - `GET /shipments/{id}` responds with the seconds left until the timer expires, or `0` if it has already expired.
- When the timer expires, `POST` to the request's `webhook_url` with the shipment `id` and the shipment data.
- A process restart must not cancel a webhook. Any timers that expired while the app was down should fire once it comes back up.
- Each timer must fire exactly once.
- Handle invalid input. `tax_number` and `export_reason` are required when the country is `GB` or `US`; the rest of the rules are in the spec.
- Write it in Python. We use Django with Django REST Framework or Django Ninja, and FastAPI, so pick one of those.
- Wrap the app and its dependencies in Docker container(s). Document the build and run steps in your submission so we can run it easily.
- Tests are mandatory. We prefer sensible testing rather than chasing 100% coverage, so cover the parts that matter.
- Keep the code reasonably documented, with docstrings where they help, and stick to PEP8.

To watch the webhook fire while you develop, you can point `webhook_url` at any endpoint that captures requests, such as <https://webhook.site>. That is only a suggestion for testing, not a requirement.

Please also write up (no need to build):

- Any assumptions you made, for example "timers are never scheduled more than X days into the future".
- The changes you would make to run on several servers and handle a high volume of requests (say, 100 timer creations per second) in production.

## Evaluation

For the frontend we look at:

- How closely the result matches the design, and how you handled the parts that were missing or unclear.
- Accessibility and responsiveness, down to 360px.
- Performance on slow connections and slower devices.
- Code quality, and how you handled the happy and unhappy paths.

For the backend we look at:

- Correctness: the endpoints behave as described, timers survive restarts, and each webhook fires exactly once.
- Horizontal scalability, mostly through your written design for running on several servers.
- Craftsmanship: clean, tested, PEP8 code, with sensible structure and documentation.

## How to submit your test

Either:

- Package the project as a `.zip` file
- Keep your `.git` folder in the file.
- Upload the packaged test to Google Drive/Dropbox and include a link in the message of your submission.

Or:

Share a link to a public GitHub or GitLab repository with the results of your test.
