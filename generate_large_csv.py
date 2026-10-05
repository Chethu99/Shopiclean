import csv
import os

TARGET_SIZE_MB = 50
TARGET_SIZE_BYTES = TARGET_SIZE_MB * 1024 * 1024
OUTPUT_FILE = "large_shopify_catalog_50mb.csv"

HEADERS = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Product Category",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Option2 Name",
    "Option2 Value",
    "Option3 Name",
    "Option3 Value",
    "Variant SKU",
    "Variant Grams",
    "Variant Inventory Tracker",
    "Variant Inventory Qty",
    "Variant Inventory Policy",
    "Variant Fulfillment Service",
    "Variant Price",
    "Variant Compare At Price",
    "Variant Requires Shipping",
    "Variant Taxable",
    "Variant Barcode",
    "Image Src",
    "Image Position",
    "Image Alt Text",
    "Status"
]

print(f"Generating {OUTPUT_FILE} (~{TARGET_SIZE_MB} MB)...")

with open(OUTPUT_FILE, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(HEADERS)
    
    row_count = 0
    product_idx = 1
    
    while f.tell() < TARGET_SIZE_BYTES:
        handle = f"sample-artisan-product-{product_idx}"
        title = f"Handcrafted Organic Product Sample #{product_idx}"
        body = f"<p>Detailed product description for item #{product_idx}. Featuring durable stitching, sustainable materials, and comprehensive warranty coverage.</p>"
        vendor = "Artisan Supply Co"
        category = "Home & Garden > Linens & Bedding"
        tags = f"wholesale, eco-friendly, catalog-batch-{product_idx % 10}"
        
        # Write 2 variants per product to simulate real store data
        for variant_num, (size, color, price) in enumerate([("Small", "Navy", "29.99"), ("Large", "Forest Green", "39.99")], start=1):
            row = [
                handle,
                title if variant_num == 1 else "",
                body if variant_num == 1 else "",
                vendor if variant_num == 1 else "",
                category if variant_num == 1 else "",
                "Apparel",
                tags if variant_num == 1 else "",
                "TRUE",
                "Size",
                size,
                "Color",
                color,
                "",
                "",
                f"SKU-{product_idx:05d}-VAR{variant_num}",
                "450",
                "shopify",
                "150",
                "deny",
                "manual",
                price,
                "49.99",
                "TRUE",
                "TRUE",
                f"98765432{product_idx % 10000:04d}{variant_num}",
                f"https://cdn.example.com/products/sample-{product_idx}-image-{variant_num}.jpg",
                str(variant_num),
                f"Front view of {title}",
                "active"
            ]
            writer.writerow(row)
            row_count += 1
            
        product_idx += 1

final_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
print(f"Done! Created {OUTPUT_FILE}")
print(f"Total Rows: {row_count:,}")
print(f"Final Size: {final_size_mb:.2f} MB")