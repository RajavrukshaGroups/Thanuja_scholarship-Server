require("dotenv").config();
const { google } = require("googleapis");
const oauth2Client = new google.auth.OAuth2(
 process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

//localhost code
// const code = "4/0Aci98E_HdBNxaFLH75gt8VAv14fjBanuFtjz8RwjH0RV1dtauM71nkU693Qq-oZLRpoiyQ";

//live server code
const code="4/0Aci98E8lxlXHVKk1ozOxSrdSNvuS6LGJbcGluzbGU6u8LoHD8l6mwEXLnWI9gnMMBr9Lxw"

async function getToken() {
  const { tokens } = await oauth2Client.getToken(code);
  console.log("REFRESH TOKEN:", tokens.refresh_token);
}

getToken();