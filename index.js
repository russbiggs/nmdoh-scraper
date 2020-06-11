const chromium = require('chrome-aws-lambda');
const AWS  = require('aws-sdk');
const s3 = new AWS.S3();


exports.handler = async (event, context) => {
    const data = await scrapePage();
    const params = {
        Bucket: "nmdoh-covid",
        Key: "nmdoh-data.json"
    }
    const s3Obj = await s3.getObject(params).promise();
    const s3Data = s3Obj.Body.toString('utf-8');
    const records = JSON.parse(s3Data);
    let newObj = false;
    for (const key in data) {
        if (records.slice(-1)[0][key] != data[key]){
            newObj = true;
            continue
        }
    }
    if (newObj) {
        records.push(data);
        await uploadFileToS3(records);
    } else {
        console.log('no changes');
    }
};

async function scrapePage() {
    const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });
  const page = await browser.newPage();
  await page.goto('https://cv.nmhealth.org/', {waitUntil: 'networkidle0'});
    const positive = await page.evaluate(() => {
        return document.querySelector('#et-boc > div > div > div.et_pb_section.et_pb_section_1.et_pb_with_background.et_section_regular > div > div.et_pb_column.et_pb_column_1_3.et_pb_column_2.et_pb_css_mix_blend_mode_passthrough.et-last-child > div.et_pb_module.et_pb_text.et_pb_text_2.et_pb_text_align_left.et_pb_bg_layout_dark > div > table > tbody > tr:nth-child(1) > td:nth-child(2)').innerText;
    });
    const negative = await page.evaluate(() => {
        return document.querySelector('#et-boc > div > div > div.et_pb_section.et_pb_section_1.et_pb_with_background.et_section_regular > div > div.et_pb_column.et_pb_column_1_3.et_pb_column_2.et_pb_css_mix_blend_mode_passthrough.et-last-child > div.et_pb_module.et_pb_text.et_pb_text_2.et_pb_text_align_left.et_pb_bg_layout_dark > div > table > tbody > tr:nth-child(2) > td:nth-child(2)').innerText;
    });
    const totalTests = await page.evaluate(() => {
        return document.querySelector('#et-boc > div > div > div.et_pb_section.et_pb_section_1.et_pb_with_background.et_section_regular > div > div.et_pb_column.et_pb_column_1_3.et_pb_column_2.et_pb_css_mix_blend_mode_passthrough.et-last-child > div.et_pb_module.et_pb_text.et_pb_text_2.et_pb_text_align_left.et_pb_bg_layout_dark > div > table > tbody > tr:nth-child(3) > td:nth-child(2)').innerText;
    });
    const meta = await page.evaluate(() => {
        return document.querySelector('#et-boc > div > div > div.et_pb_section.et_pb_section_1.et_pb_with_background.et_section_regular > div > div.et_pb_column.et_pb_column_1_3.et_pb_column_2.et_pb_css_mix_blend_mode_passthrough.et-last-child > div.et_pb_module.et_pb_text.et_pb_text_2.et_pb_text_align_left.et_pb_bg_layout_dark > div > p:nth-child(4) > em'
        ).innerText;
    });
    await browser.close();
    const data = {
        "meta": meta,
        "positive": positive,
        "negative": negative,
        "totalTests": totalTests    
    };
    return data;
}

async function uploadFileToS3(fileData) {
    const params = {
        Bucket: "nmdoh-covid",
        Key: "nmdoh-data.json",
        Body: JSON.stringify(fileData),
    };

    try {
        const response = await s3.upload(params).promise();
        console.log(response);
        return response;

    } catch (err) {
        console.log(err);
    }
}