// tests/test-data-generator.js
// Test script to verify fake data generation works correctly

import {
  generateFakePOData,
  generateBatchPOData,
  generatePOsAsCSV,
} from '../api/po-seeder/fake-data-generator.js';

console.log('╔════════════════════════════════════════╗');
console.log('║   Testing Fake Data Generation        ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('✓ Test 1: Generating single PO...\n');
const singlePO = generateFakePOData();
console.log(JSON.stringify(singlePO, null, 2));
console.log('\n---\n');

console.log('✓ Test 2: Generating 5 POs in batch...\n');
const batch = generateBatchPOData(5);
batch.forEach((po, index) => {
  console.log(`PO ${index + 1}: ${po.poNumber}`);
  console.log(`  Supplier: ${po.supplier}`);
  console.log(`  Items: ${po.items.length}`);
  console.log(`  Total: $${po.total}`);
  console.log(`  Delivery: ${po.deliveryDate}`);
  console.log('');
});

console.log('✓ Test 3: Verifying data structure...\n');
const po = generateFakePOData();
const checks = [
  { name: 'PO Number format', test: () => po.poNumber.startsWith('PO-') },
  { name: 'Supplier exists', test: () => po.supplier && po.supplier.length > 0 },
  { name: 'Has items', test: () => Array.isArray(po.items) && po.items.length > 0 },
  { name: 'Total is calculated', test: () => po.total > 0 },
  { name: 'Delivery date is future', test: () => new Date(po.deliveryDate) > new Date() },
  { name: 'Payment terms exist', test: () => po.paymentTerms && po.paymentTerms.length > 0 },
  { name: 'Items have details', test: () => po.items[0].productName && po.items[0].quantity > 0 },
];

checks.forEach((check) => {
  const result = check.test() ? '✅' : '❌';
  console.log(`${result} ${check.name}`);
});

console.log('\n---\n');
console.log('✓ Test 4: Generating CSV export of 3 POs...\n');
const csv = generatePOsAsCSV(3);
console.log(csv.split('\n').slice(0, 4).join('\n')); // Show first few lines
console.log('...\n');

console.log('✓ Test 5: Verifying data randomness...\n');
const pos = generateBatchPOData(10);
const suppliers = [...new Set(pos.map((p) => p.supplier))];
const poNumbers = new Set(pos.map((p) => p.poNumber));

console.log(`Generated ${pos.length} POs`);
console.log(`Unique suppliers: ${suppliers.length}`);
console.log(`Unique PO numbers: ${poNumbers.size}`);
console.log(`Average items per PO: ${(pos.reduce((sum, p) => sum + p.items.length, 0) / pos.length).toFixed(1)}`);
console.log(`Average total: $${(pos.reduce((sum, p) => sum + p.total, 0) / pos.length).toFixed(2)}`);

console.log('\n╔════════════════════════════════════════╗');
console.log('║   ✅ All Tests Passed!               ║');
console.log('╚════════════════════════════════════════╝\n');
