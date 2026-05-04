const axios = require('axios');

async function test() {
  const key = 'dvVJ80NBaP7tj1XoluP079EseN8Q97TRNTEmwY8K'; 
  try {
    const res = await axios.get("https://api.api-ninjas.com/v1/interestrate?name=Indian", {
      headers: { "X-Api-Key": key }
    });
    console.log("Interest Rate Data:", res.data);
  } catch (err) {
    console.log("Interest Rate Error:", err.response ? err.response.data : err.message);
  }
}
test();
