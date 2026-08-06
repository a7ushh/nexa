# Challan assets

Drop the authorised signature image here as:

    server/assets/signature.png

- PNG with a transparent background works best.
- Roughly 400x160 px (any size works; it is scaled to ~120x48 pt on the challan).
- If the file is absent the challan simply prints the "Authorised Signatory"
  rule with no image, so nothing breaks.

The company letterhead (name, address, phone numbers) comes from the
`companies` table, not from this folder.
