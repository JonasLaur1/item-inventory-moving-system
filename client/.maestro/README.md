# BoxIt — Maestro UI Test Suite

Automated end-to-end UI tests written with [Maestro](https://maestro.mobile.dev/), a mobile UI testing framework comparable to Selenium IDE / Appium but specifically optimised for iOS and Android.

---

## Prerequisites

| Requirement | How to install |
|---|---|
| Maestro CLI | `curl -Ls "https://get.maestro.mobile.dev" \| bash` (macOS/Linux) or see [docs](https://maestro.mobile.dev/getting-started/installing-maestro) for Windows |
| Android emulator **or** physical Android device | Android Studio AVD Manager or USB debugging |
| BoxIt debug APK installed on the device | `npx expo run:android` from the `client/` directory |
| Java 11+ | Required by Maestro internally |

---

## Environment variables

All flows that perform login read credentials from environment variables so that secrets are never committed to source control.

| Variable | Purpose | Example |
|---|---|---|
| `BOXIT_EMAIL` | Existing test account email | `test@boxit.lt` |
| `BOXIT_PASSWORD` | Existing test account password | `testpassword123` |
| `BOXIT_REG_EMAIL` | Fresh email for registration TC-03 | `test_1234@boxit.lt` |

Export them in your shell before running:

```bash
export BOXIT_EMAIL="boxit.test@gmail.com"
export BOXIT_PASSWORD="BoxitTest123!"
export BOXIT_REG_EMAIL="test_$(date +%s)@boxit.lt"
```

---

## Running tests

### Run a single flow

```bash
maestro test .maestro/flows/01-login.yaml
```

### Run all flows in sequence

```bash
maestro test .maestro/flows/
```

### Run with a cloud device (Maestro Cloud)

```bash
maestro cloud --apiKey <YOUR_API_KEY> .maestro/flows/
```

---

## Test case catalogue

| File | ID | Scenario | Preconditions |
|---|---|---|---|
| `01-login.yaml` | TC-01 | Login with valid credentials | Registered account via `BOXIT_EMAIL` |
| `02-login-invalid-credentials.yaml` | TC-02 | Login error for wrong credentials | — |
| `03-register.yaml` | TC-03 | New user registration | Fresh `BOXIT_REG_EMAIL` |
| `04-create-location.yaml` | TC-04 | Create location "Maestro Test Home" with 3 rooms | Logged-in account |
| `05-create-box.yaml` | TC-05 | Create "Kitchen Box #1" in Kitchen room | TC-04 |
| `06-add-item.yaml` | TC-06 | Add "Coffee Maker" item (qty 2, fragile) to box | TC-05 |
| `07-box-detail-actions.yaml` | TC-07 | Edit box name; delete item via confirmation | TC-06 |
| `08-inventory-search-and-filter.yaml` | TC-08 | Inventory search + status/fragile filters | TC-05 |
| `09-activity-tab.yaml` | TC-09 | Activity feed search + time-window + type filter | TC-04 |
| `10-profile-and-logout.yaml` | TC-10 | Theme switcher; Log Out returns to login | Logged-in account |
| `11-forgot-password.yaml` | TC-11 | Forgot-password form validation + submission | — |
| `12-qr-box-detail.yaml` | TC-12 | Open QR code modal on a box detail screen | TC-07 |

The recommended execution order (for a clean device) is TC-01 → TC-04 → TC-05 → TC-06 → TC-07 → TC-08 → TC-09 → TC-10.  
TC-02, TC-03, TC-11, and TC-12 are independent and can run in any order.

---

## How Maestro finds UI elements

Maestro drives the device via the Android accessibility tree (same mechanism as TalkBack). For React Native / Expo apps, every `<Text>` and interactive component is exposed automatically without adding `testID` props to the source code.

Elements are matched by:
- **visible text** — `tapOn: "Sign In"` finds the button labelled "Sign In"
- **`testID` / `accessibilityLabel`** — `tapOn: { id: "profile-button" }` for custom identifiers
- **`optional: true`** — skips the tap gracefully if the element is absent (used for platform-specific elements)

---

## Notes for the bachelor thesis

These tests represent **automated black-box UI testing** — the test runner acts as a real user by tapping, typing, and asserting visible text, with zero access to the app's internal state. This is the mobile equivalent of Selenium IDE for web applications. The key advantages over manual testing are:

1. **Repeatability** — the same scenario executes identically every run.
2. **Regression detection** — a layout or text change that breaks a user flow is caught immediately.
3. **Documentation** — each YAML file is human-readable and serves as a living specification of expected behaviour.
