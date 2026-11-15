# WhatsApp notification template (for Meta approval)

When a booking request arrives, the site sends the driver a WhatsApp message through the
WhatsApp Business Cloud API. Business-initiated messages must use a pre-approved template.
Submit the template below in Meta Business Suite (WhatsApp Manager > Message templates).
Verify field names and requirements against Meta's current documentation: they change often.

## Template to submit

| Field | Value |
|---|---|
| Name | `novo_pedido_reserva` (must equal `WHATSAPP_TEMPLATE_NAME`) |
| Category | Utility |
| Language | Portuguese (Portugal), code `pt_PT` (must equal `WHATSAPP_TEMPLATE_LANG`) |
| Header / footer / buttons | none |

Body:

```
Novo pedido de reserva {{1}}: {{2}}, {{3}}, {{4}}. Cliente: {{5}}, telemóvel {{6}}. Responda ao cliente para confirmar. Este pedido ainda não está confirmado.
```

Variables, in this order (the code sends them in this order, each on a single line, max 60
characters, no newlines or tabs):

| # | Content | Example |
|---|---|---|
| {{1}} | Reference | `JV-2026-AB12CD` |
| {{2}} | Service | `Tour pelo Oeste da Madeira` |
| {{3}} | Date (and time if given) | `20/12/2026 09:30` |
| {{4}} | People | `2 adultos, 1 criança` |
| {{5}} | Customer name | `Anna Schmidt` |
| {{6}} | Customer phone | `+4915123456789` |

Samples to give Meta when asked for examples: use the example column above.
Full details (locations, flight, notes, email) are in the email to the driver; the WhatsApp
message is only a short alert.

Meta rejects a template when a variable is at the very start or end of the body, when there are
too many variables for the text length, or when variables are adjacent without text between
them. The proposal above avoids these; if Meta objects, add a few words and keep the variable order.

## Environment variables

```
WHATSAPP_ENABLED=true
WHATSAPP_API_TOKEN=            # permanent system-user token (never the temporary test token)
WHATSAPP_PHONE_NUMBER_ID=      # numeric id of the sending number (not the phone number itself)
WHATSAPP_DRIVER_TO=            # who receives the alert, international format, e.g. 351912345678
WHATSAPP_API_VERSION=v23.0
WHATSAPP_TEMPLATE_NAME=novo_pedido_reserva
WHATSAPP_TEMPLATE_LANG=pt_PT
```

Important: the recipient must be a different WhatsApp number from the sending business number.
A number cannot message itself. If João wants the alert on his main phone, the sending number has
to be another one (or see the open point at the end).

## Setup steps (coexistence mode)

Coexistence lets one number work in the WhatsApp Business app (João keeps chatting with clients)
and on the Cloud API at the same time. Meta's requirements change, so check the current
"WhatsApp Business app coexistence" documentation before starting.

1. Create or open a Meta Business portfolio (business.facebook.com) owned by João or his
   company, and complete business verification if Meta asks for it.
2. Create a Meta developer app (developers.facebook.com), type Business, and add the
   WhatsApp product.
3. Make sure the number runs the WhatsApp Business app (not the regular WhatsApp) at a version
   that supports coexistence, and was recently active.
4. In the app's WhatsApp section, use Embedded Signup and choose to connect an existing WhatsApp
   Business app number. Scan the QR code with the Business app on João's phone and approve. Keep the
   Business app opened on the phone regularly afterwards, otherwise the link can be dropped.
5. Note the Phone number ID and the WhatsApp Business Account ID shown in WhatsApp Manager.
6. Create a system user in Business settings (Users > System users), give it the app and the
   WhatsApp account, and generate a permanent token with the `whatsapp_business_messaging`
   permission. Store it only as `WHATSAPP_API_TOKEN` on the host (Vercel environment
   variables). Never commit it.
7. Submit the template from this page and wait for approval (usually minutes to a day).
8. Add a payment method to the WhatsApp Business Account if Meta requires one for
   business-initiated messages.
9. Set the variables above in the hosting environment, deploy, and send a test request from the
   site. Check the delivery status stored in MongoDB (`delivery.whatsapp`).

## Open points

- A coexistence number cannot alert itself. Decide with João: (a) a second number for the API
  that alerts his main phone, or (b) skip WhatsApp alerts and rely on email, or (c) alert a
  different person or number.
- Meta pricing for utility templates and the free service window should be checked for Portugal.
- Opt-in: the alert goes to the driver only (his own business), the customer receives no
  WhatsApp message from the site.
