Design md

Use figma mcp

Read and fetch design from figma
figma URL:
https://www.figma.com/design/iRmDeaUQyeS1MrMM0XXdB7/nexa?node-id=0-1&t=1AncbQpHKjsD3nfQ-1


Create web responsive application using react, node, Postgres tech stack.

Hosted on port:5000
Postgres on port:6789

Colour: off white and dark navy blue.

Build project with Layered Architecture.

UI for both web app and android web app are in Figma file.
Android web app design as feature is same but if anyone open in mobile it shows android UI,
three lines are menu(navbar) and filter shifted down side.

Input field design (assets/input_field.png)

Create input form shown in figma frame name- input form
Replicate each frame without changes
In navbar keep margin left and write and does not change how navbar looks, even that sub option is within navbar.

Ignore the table shown it the design it only shows where to place the data.
There two section in grey: in progress and past records
if(row created date past 1month) then comes under past records,
else then comes under in progress

There are three section in embroidery and handwork (issue): deadline, in progress and completed records
if(receive is create against that issue challan no.) then comes under completed records,
else if(full quantity receive is not created after 7days of issue challan no.) then comes under deadline,
else then comes under in progress

There are two section in embroidery and handwork (receive): in progress and completed records
There two section in grey: in progress and past records
if(whole issue quantity is received) then comes under completed records,
else then comes under in progress

Even issue challan quantity can be received in parts keep track that quantity does not exceed.

For sign in google account is used. For first time- user was asked for username and a PIN which is required every time they login/ sign in and wait till access is provided by the owner or root user
Their login/ sign in session/cookies expires if they close the browser or 10mins of inactive.

Then User select under which company to work.

Grey:
Table columns:
Checkbox, LOT no., DATE, Master Head, Fabric, CHART, CUT, QUANTITY, DUPATTA, BOTTOM (Boolean)

options:
edit
delete (only admin, owner, root)
dupatta= if no is selected then no,
else if yes then select whether tone or contrast (select box appear in input box)

filter:
1. Lot no.
2. Master Head
3. Fabric
4. Chart
5. Dupatta (boolean)
6. Bottom (boolean)
7. Date


Issue embroidery:
Table columns
Checkbox, Date, lot no., challan no., master head, fabric, design, Dupatta, Dup. qty, quantity, rate, amount

options:
edit
delete (only admin, owner, root)
share (only admin, owner, root)

dupatta= if no is selected then select whether diamond or chain or plain, (select box appear in input box)
else if yes then yes 
amount = (dup. qty + quantity) * rate
default dup. qty and quantity = 0
quantity and dup. qty are bounded to total quantity mention with lot.

filter:
1. Lot no.
2. Challan no.
3. Master Head
4. Fabric
5. Design
6. Dupatta (boolean)
7. Date


Receive embroidery:
Table columns:
Checkbox, Date, lot no., challan no., retail challan no., master head, fabric, design, Dupatta, Dup. qty, quantity, rate, damaged, loss, amount

options:
edit
delete (only admin, owner, root)

amount = (dup. qty + quantity) * rate – (loss + damaged) 
default dup. qty and quantity = 0
quantity and dup. qty are bounded to total quantity mention with lot.

filter:
1. Lot no.
2. Challan no.
3. Master Head
4. Fabric
5. Design
6. Dupatta (boolean)
7. Date


Issue handwork:
Table columns:
Checkbox, Date, lot no., challan no., master head, fabric, design, quantity, rate, amount

options:
edit
delete (only admin, owner, root)
share (only admin, owner, root)

amount = (dup. qty + quantity) * rate
default quantity = 0
quantity and dup. qty are bounded to total quantity mention with lot.

filter:
1. Lot no.
2. Challan no.
3. Master Head
4. Fabric
5. Design
6. Date


Receive handwork:
Table columns:
Checkbox, Date, lot no., challan no., master head, fabric, design, quantity, rate, damaged, loss, amount

options: 
edit 
delete (only admin, owner, root)

amount = (quantity) * rate – (loss + damaged) 
default quantity = 0
quantity and dup. qty are bounded to total quantity mention with lot.

filter:
1. Lot no.
2. Challan no.
3. Master Head
4. Fabric
5. Design
6. Date


Report:
It shows all the tables(rows) which are involved that are showed with a last row add as total- in each table, which show the total of amount of the table.

filter:
1. Lot no.
2. Challan no.
3. Master Head
4. Fabric
5. Date


Masters:
Add all the masters that can be selected in the master head field while fill the input form.

Logs:
It shows every change onto the web application.
All logins and exits for every user.


Database:
each company have company id connected to every row to identifies which company data it is.

In challan form:
input field lot no. works as search bar it show the all the matches lot no. and remaining quantity of lot and dupatta seperatly and user select it.

In receive form:
input field challan no. works as search bar it show the all the matches challan no. and master head of that challan no. and user select it.

every detail should be fetched and paste in their respective fields by entering lot no. in issue embroidery and issue

handwork and challan no. in receive embroidery and receive handwork. But can be editable.
lot no. is auto generated like MMSS (month series).
each challan no. is unique fill by the user but prefilled with next number e.g. Last challan no. was 2 then while filling new form in challan no. should prefilled 3, but can be changed by the user.
Each filter fetches its own table then join them union.
Every can be editable but keep the previous data too like the image (assets/previous_data.png).
	 

Tables:
Only display the selected columns and if nothing is selected then display the all columns.
When checkbox of a row is selected then appear to button to multi-share and multi-delete.
Add a clear filter button inside column selector.

Roles and permissions:
There are six roles:
    o	Root
    o	Owner
    o	Admin
    o	Grey
    o	Embroidery
    o	Handwork
Root- have all the access and assign role of owner, admin, grey, embroidery and handwork and their can only be one root user that is provided by sql command by developer.
Owner- have all the access but log page is not visible to them and assign role of admin, grey, embroidery and handwork.
Admin- have all access, leave users and log pages.
Grey- only access to grey page and only add or edit but cannot delete.
Embroidery- only access to embroidery page and only add or edit but cannot delete.
Handwork- only access to handwork page and only add or edit but cannot delete.

Challan:
Challan is generated with the fields data; it is not stored it generated which can be directly share or download.

Format: (assets/challan.png)

 
Table show all the column that has value if any column is empty or null it does not appear in the table and column challan no. is also should not be display in the table as it is show above. And also remove checkbox column as it does not hold any meaning.
E- for Embroidery and H- for handwork.

Additional features:
There is a button is called backup is user page- it backup the database into google drive using google API.
When clicked on share button is open a full stretch box that asked the user whether to download or share directly.


Create a setup file that help in setting up auto database, hosting, adding google token and JWT token.


---

## Build Progress

- [x] 1. Scaffold, design tokens, database schema, setup file
- [x] 2. Auth chain — Google sign-in, username + PIN, access gate, session rules
- [x] 3. Company select and app shell (navbar, filter rail, section dividers)
- [x] 4. Shared table system (columns, filters, multi-select, edit history)
- [x] 5. Grey
- [x] 6. Embroidery — Issue
- [x] 7. Embroidery — Receive
- [x] 8. Handwork — Issue
- [x] 9. Handwork — Receive
- [x] 10. Report
- [x] 11. Masters
- [x] 12. Users, Logs and Backup
- [x] 13. Challan generation and share
- [x] 14. Android (mobile) layouts
- [x] 15. Hardening — lint, permission matrix, final pass

- [x] 16. Restyle to the Figma `loading` page (features unchanged)

### Notes carried from the build

- The UI follows the Figma **`loading` page** (node `79:89`), a later redesign
  of the whole app. Its 25 frames are exported to `assets/loading/`.
- Tokens: off white `#faf9f6`, navy `#0c324a` (rail, filter panel, pill
  buttons), accent `#006fff` (Apply / confirm), company-card blue `#448aff`,
  navbar rule `#e7e3dc`, table head `#c8c7c5`, field outline `#cccccc`, field
  icon cell `#f6f2f9`, PIN box `#f6f6f6`, calendar accent `#97d0c3`.
- Type is mixed: the wordmark and navbar are **Raleway** (Bold / SemiBold 26px,
  18.2px tracking); every label, value, button and page heading is
  **Source Code Pro**.
- Icons are the exact Iconify glyphs the design names (feather `edit-3`,
  `trash-2`, `x`; `material-symbols:add-rounded`; `mingcute:column-fill`;
  `file-icons:fabric`; `f7:number`), compiled into the bundle by
  unplugin-icons so nothing is fetched at runtime.
- Layout constants: navbar 118px with a 3px rule, filter rail 70px, expanded
  filter panel 415px. The filter panel is part of the layout, not an overlay.
- Sections are labelled **In Progress** / **Past Records** (and **Not Received**
  on the issue pages), and empty tables read **No records**.
- The PIN stays **4 digits**. The design draws six boxes, but PIN length is a
  functional rule (validation, the seeded root account and `setup.js` all use
  four), so only the box styling was adopted.
- An overdue issue challan shows in **both** Not Received and In Progress - it
  is late, but it has not left the floor.
- Dates use a custom calendar (`components/form/DatePicker.jsx`) instead of the
  browser control, with Today / Last 1 week / Last month shortcuts in the
  filter panel.
- The printed challan carries the company letterhead from `companies.address`
  and `companies.phone` (migration `002`), the party address from the master,
  and an optional signature image at `server/assets/signature.png`. Root, owner
  and admin edit those fields from the company-select screen.
- **Google Drive is not requested at sign-in.** `drive.file` is a sensitive
  scope, so asking for it up front showed every user a Drive consent panel and
  Google's "hasn't verified this app" screen. Sign-in now asks for identity
  only; root grants Drive once, on demand, from the Backup button
  (`GET /api/auth/google/drive`).
- Lot no., Challan no. and **Master Head** are all prefix type-aheads; names
  starting with the term rank above other matches.
- Calendars and type-ahead lists render through `components/Popover.jsx`, which
  portals to the body and flips or clamps to the viewport, so they are never
  clipped by the scrolling filter panel or form.
- The issue form has two dupatta switches: **Only Dupatta** at the form level
  hides Quantity and bills dupatta pieces alone; the **Dupatta** field toggle
  shows or hides the finish select and Dup. Qty. Both work through the existing
  amount rule, so no server maths changed.
- The Report page exports the same five sections as a PDF, offered for download
  or direct share through the shared ShareSheet.
- Not drawn in Figma, built in the same visual language: the Log page, the share
  sheet, the Grey "Add Lot" form, the returning-user PIN screen, and the mobile
  layouts for every module other than Embroidery/Issue.
- The app runs on **one port only** (5000). In development Vite is mounted as
  Express middleware, so nothing listens on 5173.
- The Figma input-form frame draws five fields; the remaining spec fields
  (Dupatta, Dup. Qty, Quantity, Rate, Amount) continue the same two-column grid
  using the same 335x41 field component. Amount is read-only — the server
  computes it and the form only previews it.
- Decorative iconify glyphs from the Figma fields (person, fabric, palette,
  chart) are not reproduced; number fields keep their `#` prefix. Everything
  else — spacing, colour, type, layout — follows the frames.

### How to run

    npm run setup     # one-time: database, secrets, Google keys, root user
    npm run dev       # http://localhost:5000
    npm run build && npm start    # production, same port
