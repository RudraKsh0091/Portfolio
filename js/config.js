/* ==========================================================================
   Site configuration: edit this file first.

   CONTACT FORM: sends the visitor's name + message to your inbox, from YOUR own
   Gmail account, using EmailJS (free: 200 emails/month). One-time setup:

     1. Sign up at https://www.emailjs.com  (use rudrakshgarg.ai@gmail.com).
     2. Email Services -> Add New Service -> Gmail -> connect your Gmail. Copy the Service ID.
     3. Email Templates -> Create New Template. Set:
          To Email:   rudrakshgarg.ai@gmail.com
          Reply To:   {{reply_to}}
          Subject:    {{subject}}
          Content:    From: {{from_name}} ({{reply_to}})
                      Sent: {{sent_at}}

                      {{message}}
        Save, then copy the Template ID.
     4. Account -> General -> copy your Public Key.
     5. Paste the three values below, save, redeploy. Send yourself a test message.

   In EmailJS (Account -> Security) also add your site's domain to the allow-list,
   so nobody else can use your keys. The public key is safe to expose by design.

   Until EmailJS is filled in the form falls back to Web3Forms (key below, optional),
   and finally to opening the visitor's email app with a draft.
   ========================================================================== */
window.SITE_CONFIG = {
  emailjs: {
    publicKey: "",     // <- EmailJS Public Key
    serviceId: "",     // <- EmailJS Service ID (your connected Gmail)
    templateId: ""     // <- EmailJS Template ID
  },
  web3formsKey: "a7504102-2293-4fe1-8b86-fe570b1772b3",    // <- optional alternative: https://web3forms.com
  email: "rudrakshgarg.ai@gmail.com",
  roles: [
    "AI / ML Engineer",
    "GenAI and RAG builder",
    "Data science and forecasting",
    "From notebook to deployment"
  ]
};
