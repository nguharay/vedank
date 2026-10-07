# Player activity → Google Sheet (setup, ~5 minutes)

The app writes player activity straight into a Google Sheet. No database or
paid tools are involved.

**What lands in the sheet**
- **Activity** — one row per meaningful action:
  - **Visits**
    - `app_open` — a visit: new device or returning, where it came from, hour of day
    - `visit_end` — when the app is closed or put away: minutes played, games opened and finished
  - **Games**
    - `game_open`
    - `game_end` (score, stars, new best; every game including Race, quick games and matchsticks)
    - `demo_view`
    - `chest_open`
  - **Learning**
    - `topic_open`
    - `lesson_stage_end` (stars, correct answers)
    - `daily_done`
    - `locked_tap` (a guest tapped something that needs an account)
  - **Growth**
    - `notification_open`
    - `push_permission`
    - `install_click`
    - `install_result`
    - `join_class`

  Each row has the date and time (JST), the player (name and short ID, or "Guest xxxxxx"), the device (phone, tablet or desktop), whether the app is installed, and the language.
- Each evening's notification is also a row (`notification_sent`): which message went out, and to how many people.
- **Activity Summary** — live tables:
  - players per day
  - visits per day
  - new devices per day
  - play time per day and per player
  - plays per game
  - finished games with average and top scores
  - each player's visits and last seen
  - notification taps per day vs notifications sent
  - lessons played

Screen-by-screen movement is **not** sent to the sheet (it would fill up fast). It goes to GA4 and Clarity instead, once their IDs are set in Vercel:
- `NEXT_PUBLIC_GA_ID` (looks like `G-XXXXXXX`)
- `NEXT_PUBLIC_CLARITY_ID` (the Clarity project id)

## Steps (using the sheet that already gets registrations)

The activity script is a separate Apps Script project, so the sheet's
registration script is left exactly as it is.

1. Go to **https://script.google.com** → **New project**. Name it *VedAnk Activity*.
2. Delete what's there and paste all of `docs/activity-sheet.gs`. Set two lines:
   - `SHEET_ID`: the long id from the sheet's link (`.../spreadsheets/d/<THIS PART>/edit`)
   - `SECRET`: the same secret the registration connection uses (`SHEET_WEBHOOK_SECRET` in Vercel)

   Click 💾 Save.
3. In the toolbar, choose **setupSummary**, then click **▶ Run**. Allow access when Google asks. This adds an **Activity** tab right after Registrations, and an **Activity Summary** tab after it; Registrations and Enquiries are untouched.
4. **Deploy → New deployment**:
   - Gear icon → **Web app**.
   - **Execute as:** Me.
   - **Who has access:** Anyone.
   - Click **Deploy**, then **copy the Web app URL**.
5. In **Vercel → vedank → Settings → Environment Variables → Production**, add one:

   | Name | Value |
   |---|---|
   | `ACTIVITY_WEBHOOK_URL` | the Web app URL from step 4 |

   (It reuses `SHEET_WEBHOOK_SECRET`. To use a different secret, also add `ACTIVITY_WEBHOOK_SECRET`.)
6. Redeploy (or ask Claude to push). Rows start arriving as people play.

**Share** the sheet with your marketing team as *Viewer*. Make their own charts or
pivot tables from the Activity tab.

**Size:** a Google Sheet holds about 700,000 Activity rows. Every few months, copy old rows
to an archive sheet and delete them from Activity.
