

import decompressResponse from 'decompress-response';

let jsonData: any = {};


document.getElementById("load_data")?.addEventListener("click", () => {
console.log('Fetching and decompressing the JSON file...');
fetch('./mega_data.json.gz')
  .then(response => decompressResponse(response))
  .then(decompressedResponse => decompressedResponse.json())
  .then(data => {
        jsonData = data;
  })
  .catch(error => {
    console.error('Error fetching or decompressing the JSON file:', error);
  });
  document.getElementById("load_data")?.setAttribute("style", "display:none");
  document.getElementById("search-window")?.setAttribute("style", "display:block");
});
