// api/po-seeder/fake-data-generator.js
const SUPPLIERS = [
  'Acme Manufacturing',
  'Global Trade Ltd',
  'Premium Imports Inc',
  'Quality Distributors',
  'Wholesale Supply Co',
  'Direct Factory Sales',
  'International Traders',
  'Bulk Goods Ltd',
  'Industrial Supply Group',
  'Trade Center International',
  'Express Distribution',
  'Prime Wholesale',
  'Elite Suppliers',
  'Global Commerce Inc',
  'Standard Manufacturing',
];

const PRODUCTS = [
  'Raw Cotton Fabric',
  'Polyester Thread',
  'Metal Fasteners',
  'Plastic Pellets',
  'Glass Bottles',
  'Aluminum Sheet',
  'Rubber Gaskets',
  'Wooden Pallets',
  'Cardboard Boxes',
  'Shipping Labels',
  'Industrial Paint',
  'Machine Parts',
  'Electronic Components',
  'Packaging Materials',
  'Safety Equipment',
  'Tool Sets',
  'Cleaning Supplies',
  'Office Stationery',
  'Batteries',
  'Light Fixtures',
];

const UNITS = ['pcs', 'kg', 'box', 'roll', 'case', 'carton', 'pallet', 'set', 'bag', 'tube'];
let poSequence = 1; 

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generatePONumber(sequence) {
  const seq = sequence.toString().padStart(4, '0');
  return `PO-${seq}`;
}

function generateDeliveryDate() {
  const today = new Date();
  const daysToAdd = randomInt(30, 90);
  const deliveryDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const year = deliveryDate.getFullYear();
  const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
  const day = String(deliveryDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function generateLineItem() {
  return {
    productName: randomItem(PRODUCTS),
    quantity: randomInt(10, 1000),
    unit: randomItem(UNITS),
    unitPrice: randomFloat(0.5, 500),
    total: 0,
  };
}

export function generateFakePOData(sequence = null) {
  const itemCount = randomInt(1, 5);
  const items = Array.from({ length: itemCount }, generateLineItem);

  for (const item of items) {
    item.total = parseFloat((item.quantity * item.unitPrice).toFixed(2));
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = parseFloat((subtotal * 0.1).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  return {
    poNumber: generatePONumber(poSequence++),
    supplier: randomItem(SUPPLIERS),
    items,
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax,
    total,
    deliveryDate: generateDeliveryDate(),
    notes: randomItem([
      'Rush delivery preferred',
      'Standard delivery',
      'Expedited shipping required',
      'Quality inspection on receipt',
      'Invoice must match PO',
      '',
    ]),
    referenceNumber: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    paymentTerms: randomItem(['Net 30', 'Net 60', 'COD', 'Due on receipt']),
    incoterms: randomItem(['FOB', 'CIF', 'EXW', 'DDP']),
  };
}

export function generateBatchPOData(count) {
  return Array.from({ length: count }, generateFakePOData);
}

export function generatePOsAsCSV(count) {
  const pos = generateBatchPOData(count);
  const headers = ['PO Number', 'Supplier', 'Item 1', 'Quantity 1', 'Unit Price 1', 'Delivery Date', 'Total'];
  const rows = pos.map((po) => [
    po.poNumber,
    po.supplier,
    po.items[0]?.productName || '',
    po.items[0]?.quantity || '',
    po.items[0]?.unitPrice || '',
    po.deliveryDate,
    po.total,
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
}

export { randomInt, randomItem, randomFloat, generateLineItem };
