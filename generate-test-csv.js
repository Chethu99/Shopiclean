const fs = require('fs');

const headers = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags',
  'Published', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
  'Option3 Name', 'Option3 Value', 'Variant SKU', 'Variant Grams',
  'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode',
  'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card', 'Status'
];

const colors = ['Black', 'White', 'Navy', 'Heather Grey', 'Olive'];
const sizes = ['XS', 'S', 'M', 'L', 'XL'];
const rows = [headers.join(',')];

let currentProduct = 1;
let currentHandle = `product-${currentProduct}`;
let rowCount = 0;
const targetRows = 5000;

while (rowCount < targetRows) {
  currentHandle = `product-${currentProduct}`;
  const title = `Performance Apparel Item #${currentProduct}`;
  
  // Each product gets several variant rows
  for (let c = 0; c < colors.length && rowCount < targetRows; c++) {
    for (let s = 0; s < sizes.length && rowCount < targetRows; s++) {
      rowCount++;
      const isFirstRow = (c === 0 && s === 0);

      // Deliberate error injections to test audit tools:
      // 1. Currency symbol on row 200
      let price = '29.99';
      if (rowCount % 250 === 0) price = '$29.99';

      // 2. Unencoded space or bad protocol in image URL
      let imageSrc = `https://cdn.example.com/products/item_${currentProduct}_${colors[c].toLowerCase()}.jpg`;
      if (rowCount % 300 === 0) {
        imageSrc = `https://cdn.example.com/products/item ${currentProduct} front.jpg`; // Unencoded space
      } else if (rowCount % 450 === 0) {
        imageSrc = `ftp://files.example.com/images/catalog_${currentProduct}.png`; // Invalid protocol
      }

      // 3. Deliberate unescaped quotes on some rows
      let rowTitle = isFirstRow ? `"${title}"` : '';
      if (isFirstRow && rowCount % 400 === 0) {
        rowTitle = `"${title} 12" Display Edition"`; // Illegal quoting error
      }

      const row = [
        currentHandle,
        rowTitle,
        isFirstRow ? '"<p>High quality moisture-wicking synthetic fabric.</p>"' : '',
        isFirstRow ? 'ShopiClean Apparel' : '',
        isFirstRow ? 'Shirts' : '',
        isFirstRow ? 'summer, sale, performance' : '',
        'TRUE',
        'Color', colors[c],
        'Size', sizes[s],
        '', '',
        `SKU-${currentProduct}-${colors[c].substring(0, 2)}-${sizes[s]}`,
        '250',
        'shopify', '45', 'deny', 'manual',
        price,
        '39.99',
        'TRUE', 'TRUE',
        `890123456${(rowCount % 1000).toString().padStart(3, '0')}`,
        imageSrc,
        isFirstRow ? '1' : '',
        isFirstRow ? `Front view of ${title}` : '',
        'FALSE',
        'active'
      ];

      rows.push(row.join(','));
    }
  }
  currentProduct++;
}

fs.writeFileSync('test_shopify_5000.csv', rows.join('\n'));
console.log(`Generated test_shopify_5000.csv with ${rowCount} product rows.`);