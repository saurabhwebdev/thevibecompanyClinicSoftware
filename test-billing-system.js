/**
 * Comprehensive Test Suite for Billing, Invoices, and Payments Modules
 * Clinic Management System
 */

const axios = require('axios');

// Test Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_RESULTS = [];

// Helper function to log test results
function logTest(module, testName, action, expected, actual, status, issue = null) {
  const result = {
    module,
    testName,
    action,
    expected,
    actual,
    status,
    issue,
    timestamp: new Date().toISOString()
  };
  TEST_RESULTS.push(result);

  const statusIcon = status === 'PASS' ? '✓' : '✗';
  console.log(`\n${statusIcon} ${module} - ${testName}`);
  console.log(`  Action: ${action}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual: ${actual}`);
  console.log(`  Status: ${status}`);
  if (issue) console.log(`  Issue: ${issue}`);
}

// Helper to make authenticated requests
async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// ==================== INVOICE TESTS ====================

async function testInvoiceCreation() {
  console.log('\n=== TESTING INVOICE CREATION ===');

  const invoiceData = {
    customerName: "Test Patient",
    customerPhone: "+919876543210",
    customerEmail: "test@example.com",
    items: [
      {
        type: "medicine",
        name: "Paracetamol 500mg",
        quantity: 2,
        unit: "strip",
        unitPrice: 50,
        discount: 5,
        discountType: "percentage",
        taxRate: 12,
        hsnCode: "30049099"
      },
      {
        type: "product",
        name: "Bandage",
        quantity: 1,
        unit: "pcs",
        unitPrice: 30,
        discount: 0,
        discountType: "fixed",
        taxRate: 18,
        hsnCode: "30051010"
      }
    ],
    discountAmount: 5,
    discountType: "fixed",
    status: "draft",
    notes: "Test invoice for automated testing"
  };

  // Test 1: Calculate expected totals manually
  // Item 1: Paracetamol
  // Subtotal: 2 * 50 = 100
  // Item discount: 100 * 5% = 5
  // Taxable: 100 - 5 = 95
  // Tax: 95 * 12% = 11.40
  // Item total: 95 + 11.40 = 106.40

  // Item 2: Bandage
  // Subtotal: 1 * 30 = 30
  // Item discount: 0
  // Taxable: 30
  // Tax: 30 * 18% = 5.40
  // Item total: 30 + 5.40 = 35.40

  // Invoice totals:
  // Subtotal: 100 + 30 = 130
  // Overall discount: 5 (fixed)
  // Taxable amount: 130 - 5 = 125
  // Total tax: 11.40 + 5.40 = 16.80
  // Total amount: 125 + 16.80 = 141.80
  // Round-off: 142 - 141.80 = 0.20
  // Grand total: 142

  const result = await makeRequest('POST', '/invoices', invoiceData);

  if (result.success && result.data?.success) {
    const invoice = result.data.data;

    // Test calculations
    const subtotalMatch = invoice.subtotal === 130;
    const taxableMatch = invoice.taxableAmount === 125;
    const totalTaxMatch = Math.abs(invoice.totalTax - 16.80) < 0.01;
    const grandTotalMatch = invoice.grandTotal === 142;
    const roundOffMatch = Math.abs(invoice.roundOff - 0.20) < 0.01;

    if (subtotalMatch && taxableMatch && totalTaxMatch && grandTotalMatch && roundOffMatch) {
      logTest(
        'Invoice Creation',
        'Tax and Total Calculation',
        'Create invoice with 2 items, discounts, and GST',
        'Correct calculations: subtotal=130, taxable=125, tax=16.80, grand=142',
        `subtotal=${invoice.subtotal}, taxable=${invoice.taxableAmount}, tax=${invoice.totalTax}, grand=${invoice.grandTotal}`,
        'PASS'
      );
    } else {
      logTest(
        'Invoice Creation',
        'Tax and Total Calculation',
        'Create invoice with 2 items, discounts, and GST',
        'Correct calculations',
        `Mismatches found: subtotal=${invoice.subtotal}, taxable=${invoice.taxableAmount}, tax=${invoice.totalTax}, grand=${invoice.grandTotal}`,
        'FAIL',
        'Calculation mismatch'
      );
    }

    // Test invoice number generation
    const hasInvoiceNumber = invoice.invoiceNumber && invoice.invoiceNumber.includes('INV');
    logTest(
      'Invoice Creation',
      'Invoice Number Generation',
      'Generate unique invoice number with prefix',
      'Invoice number with INV prefix',
      hasInvoiceNumber ? `Generated: ${invoice.invoiceNumber}` : 'No invoice number',
      hasInvoiceNumber ? 'PASS' : 'FAIL'
    );

    // Test tax breakdown
    const hasTaxBreakdown = invoice.taxBreakdown && invoice.taxBreakdown.length === 2;
    logTest(
      'Invoice Creation',
      'Tax Breakdown',
      'Generate tax breakdown by rate',
      '2 tax rates (12% and 18%)',
      hasTaxBreakdown ? `${invoice.taxBreakdown.length} tax rates` : 'No breakdown',
      hasTaxBreakdown ? 'PASS' : 'FAIL'
    );

    return invoice._id;
  } else {
    logTest(
      'Invoice Creation',
      'Create Invoice',
      'POST /api/invoices',
      'Success with invoice data',
      `Failed: ${result.error?.error || 'Unknown error'}`,
      'FAIL',
      result.error?.error
    );
    return null;
  }
}

async function testInvoiceWithPayment() {
  console.log('\n=== TESTING INVOICE WITH IMMEDIATE PAYMENT ===');

  const invoiceData = {
    customerName: "Test Patient 2",
    customerPhone: "+919876543211",
    items: [
      {
        type: "service",
        name: "Consultation",
        quantity: 1,
        unit: "session",
        unitPrice: 500,
        discount: 0,
        discountType: "fixed",
        taxRate: 18,
        sacCode: "999293"
      }
    ],
    paymentAmount: 590, // Full payment
    paymentMethod: "cash"
  };

  const result = await makeRequest('POST', '/invoices', invoiceData);

  if (result.success && result.data?.success) {
    const invoice = result.data.data;

    // Expected: 500 * 1.18 = 590
    const isPaid = invoice.paymentStatus === 'paid';
    const correctAmount = invoice.paidAmount === 590;
    const zeroBalance = invoice.balanceAmount === 0;

    logTest(
      'Invoice Creation',
      'Invoice with Immediate Payment',
      'Create invoice and record payment simultaneously',
      'Payment status: paid, paid amount: 590, balance: 0',
      `status: ${invoice.paymentStatus}, paid: ${invoice.paidAmount}, balance: ${invoice.balanceAmount}`,
      (isPaid && correctAmount && zeroBalance) ? 'PASS' : 'FAIL',
      (isPaid && correctAmount && zeroBalance) ? null : 'Payment not properly recorded'
    );

    return invoice._id;
  } else {
    logTest(
      'Invoice Creation',
      'Invoice with Immediate Payment',
      'Create invoice with payment',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL',
      result.error?.error
    );
    return null;
  }
}

async function testInvoiceList(invoiceId) {
  console.log('\n=== TESTING INVOICE MANAGEMENT ===');

  // Test 1: List all invoices
  const listResult = await makeRequest('GET', '/invoices?page=1&limit=10');

  if (listResult.success && listResult.data?.success) {
    const hasInvoices = listResult.data.data.length > 0;
    const hasPagination = listResult.data.pagination;

    logTest(
      'Invoice Management',
      'List Invoices',
      'GET /api/invoices with pagination',
      'List of invoices with pagination',
      hasInvoices ? `${listResult.data.data.length} invoices found` : 'No invoices',
      (hasInvoices && hasPagination) ? 'PASS' : 'FAIL'
    );
  } else {
    logTest(
      'Invoice Management',
      'List Invoices',
      'GET /api/invoices',
      'Success',
      `Failed: ${listResult.error?.error}`,
      'FAIL'
    );
  }

  // Test 2: Filter by payment status
  const filterResult = await makeRequest('GET', '/invoices?paymentStatus=unpaid');

  if (filterResult.success && filterResult.data?.success) {
    const allUnpaid = filterResult.data.data.every(inv => inv.paymentStatus === 'unpaid');

    logTest(
      'Invoice Management',
      'Filter by Payment Status',
      'GET /api/invoices?paymentStatus=unpaid',
      'Only unpaid invoices',
      allUnpaid ? 'All invoices unpaid' : 'Filter not working',
      allUnpaid ? 'PASS' : 'FAIL'
    );
  }

  // Test 3: Get single invoice
  if (invoiceId) {
    const getResult = await makeRequest('GET', `/invoices/${invoiceId}`);

    if (getResult.success && getResult.data?.success) {
      const hasDetails = getResult.data.data.items && getResult.data.data.items.length > 0;

      logTest(
        'Invoice Management',
        'Get Single Invoice',
        `GET /api/invoices/${invoiceId}`,
        'Invoice with full details',
        hasDetails ? 'Full invoice details retrieved' : 'Incomplete data',
        hasDetails ? 'PASS' : 'FAIL'
      );
    }
  }
}

async function testInvoiceUpdate(invoiceId) {
  if (!invoiceId) return;

  console.log('\n=== TESTING INVOICE UPDATE ===');

  const updateData = {
    notes: "Updated notes for testing",
    status: "sent"
  };

  const result = await makeRequest('PUT', `/invoices/${invoiceId}`, updateData);

  if (result.success && result.data?.success) {
    const updated = result.data.data.notes === updateData.notes;

    logTest(
      'Invoice Management',
      'Update Invoice',
      'PUT /api/invoices/[id]',
      'Invoice updated successfully',
      updated ? 'Notes updated' : 'Update failed',
      updated ? 'PASS' : 'FAIL'
    );
  } else {
    logTest(
      'Invoice Management',
      'Update Invoice',
      'PUT /api/invoices/[id]',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL',
      result.error?.error
    );
  }
}

async function testInvoiceCancel(invoiceId) {
  if (!invoiceId) return;

  console.log('\n=== TESTING INVOICE CANCELLATION ===');

  const cancelData = {
    reason: "Testing cancellation"
  };

  const result = await makeRequest('DELETE', `/invoices/${invoiceId}`, cancelData);

  if (result.success && result.data?.success) {
    logTest(
      'Invoice Management',
      'Cancel Invoice',
      'DELETE /api/invoices/[id]',
      'Invoice cancelled',
      'Invoice cancelled successfully',
      'PASS'
    );
  } else {
    logTest(
      'Invoice Management',
      'Cancel Invoice',
      'DELETE /api/invoices/[id]',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL',
      result.error?.error
    );
  }
}

// ==================== PAYMENT TESTS ====================

async function testPaymentCreation(invoiceId) {
  if (!invoiceId) return;

  console.log('\n=== TESTING PAYMENT PROCESSING ===');

  const paymentData = {
    invoiceId: invoiceId,
    amount: 100,
    paymentMethod: "card",
    transactionId: "TXN123456789",
    cardLast4: "1234",
    cardType: "visa",
    notes: "Test payment"
  };

  const result = await makeRequest('POST', '/payments', paymentData);

  if (result.success && result.data?.success) {
    const payment = result.data.data;
    const hasPaymentNumber = payment.paymentNumber && payment.paymentNumber.includes('PAY');
    const hasReceiptNumber = payment.receiptNumber && payment.receiptNumber.includes('RCP');
    const correctAmount = payment.amount === 100;

    logTest(
      'Payment Processing',
      'Record Payment',
      'POST /api/payments',
      'Payment recorded with payment and receipt numbers',
      `Payment: ${payment.paymentNumber}, Receipt: ${payment.receiptNumber}, Amount: ${payment.amount}`,
      (hasPaymentNumber && hasReceiptNumber && correctAmount) ? 'PASS' : 'FAIL'
    );

    return payment._id;
  } else {
    logTest(
      'Payment Processing',
      'Record Payment',
      'POST /api/payments',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL',
      result.error?.error
    );
    return null;
  }
}

async function testPartialPayment() {
  console.log('\n=== TESTING PARTIAL PAYMENT ===');

  // Create an invoice first
  const invoiceData = {
    customerName: "Test Patient 3",
    customerPhone: "+919876543212",
    items: [
      {
        type: "medicine",
        name: "Medicine",
        quantity: 1,
        unit: "strip",
        unitPrice: 1000,
        discount: 0,
        discountType: "fixed",
        taxRate: 12
      }
    ]
  };

  const invoiceResult = await makeRequest('POST', '/invoices', invoiceData);

  if (!invoiceResult.success) {
    logTest(
      'Payment Processing',
      'Partial Payment',
      'Create invoice for partial payment test',
      'Success',
      'Failed to create invoice',
      'FAIL'
    );
    return;
  }

  const invoiceId = invoiceResult.data.data._id;
  const grandTotal = invoiceResult.data.data.grandTotal; // Should be 1120

  // Make partial payment
  const paymentData = {
    invoiceId: invoiceId,
    amount: 500, // Partial
    paymentMethod: "cash"
  };

  const paymentResult = await makeRequest('POST', '/payments', paymentData);

  if (paymentResult.success && paymentResult.data?.success) {
    // Check invoice status
    const invoiceCheckResult = await makeRequest('GET', `/invoices/${invoiceId}`);

    if (invoiceCheckResult.success) {
      const invoice = invoiceCheckResult.data.data;
      const isPartial = invoice.paymentStatus === 'partial';
      const correctPaid = invoice.paidAmount === 500;
      const correctBalance = invoice.balanceAmount === (grandTotal - 500);

      logTest(
        'Payment Processing',
        'Partial Payment',
        'Record partial payment and check invoice status',
        `Status: partial, Paid: 500, Balance: ${grandTotal - 500}`,
        `Status: ${invoice.paymentStatus}, Paid: ${invoice.paidAmount}, Balance: ${invoice.balanceAmount}`,
        (isPartial && correctPaid && correctBalance) ? 'PASS' : 'FAIL'
      );
    }
  } else {
    logTest(
      'Payment Processing',
      'Partial Payment',
      'POST /api/payments',
      'Success',
      `Failed: ${paymentResult.error?.error}`,
      'FAIL'
    );
  }
}

async function testPaymentExceedsBalance() {
  console.log('\n=== TESTING PAYMENT VALIDATION ===');

  // Create an invoice
  const invoiceData = {
    customerName: "Test Patient 4",
    customerPhone: "+919876543213",
    items: [
      {
        type: "service",
        name: "Service",
        quantity: 1,
        unit: "session",
        unitPrice: 100,
        discount: 0,
        discountType: "fixed",
        taxRate: 18
      }
    ]
  };

  const invoiceResult = await makeRequest('POST', '/invoices', invoiceData);

  if (!invoiceResult.success) return;

  const invoiceId = invoiceResult.data.data._id;
  const grandTotal = invoiceResult.data.data.grandTotal;

  // Try to pay more than balance
  const paymentData = {
    invoiceId: invoiceId,
    amount: grandTotal + 100, // Exceeds balance
    paymentMethod: "cash"
  };

  const result = await makeRequest('POST', '/payments', paymentData);

  const validationWorks = !result.success && result.status === 400;

  logTest(
    'Payment Processing',
    'Payment Exceeds Balance Validation',
    'Attempt to pay more than invoice balance',
    'Error: Payment exceeds balance',
    validationWorks ? 'Validation error returned' : 'Validation failed',
    validationWorks ? 'PASS' : 'FAIL',
    validationWorks ? null : 'Should reject overpayment'
  );
}

async function testPaymentList() {
  console.log('\n=== TESTING PAYMENT LISTING ===');

  const result = await makeRequest('GET', '/payments?page=1&limit=10');

  if (result.success && result.data?.success) {
    const hasPayments = result.data.data.length >= 0; // May be 0 if no payments
    const hasPagination = result.data.pagination;

    logTest(
      'Payment Processing',
      'List Payments',
      'GET /api/payments',
      'List of payments with pagination',
      `${result.data.data.length} payments found`,
      (hasPagination) ? 'PASS' : 'FAIL'
    );
  } else {
    logTest(
      'Payment Processing',
      'List Payments',
      'GET /api/payments',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL'
    );
  }
}

// ==================== PRODUCT TESTS ====================

async function testProductCreation() {
  console.log('\n=== TESTING PRODUCT MANAGEMENT ===');

  const productData = {
    name: "Test Medicine",
    genericName: "Test Generic",
    categoryId: "60d5ec49f1b2c8b1f8e4e1a1", // Placeholder - would need actual category
    type: "medicine",
    manufacturer: "Test Pharma",
    costPrice: 50,
    sellingPrice: 75,
    mrp: 100,
    taxRate: 12,
    hsnCode: "30049099",
    currentStock: 100,
    minStockLevel: 10,
    reorderLevel: 20,
    unit: "strip",
    prescriptionRequired: true
  };

  const result = await makeRequest('POST', '/products', productData);

  if (result.success && result.data?.success) {
    const product = result.data.data;
    const hasSKU = product.sku && product.sku.startsWith('MED');
    const stockCorrect = product.currentStock === 100;

    logTest(
      'Product Management',
      'Create Product',
      'POST /api/products',
      'Product created with auto-generated SKU',
      `SKU: ${product.sku}, Stock: ${product.currentStock}`,
      (hasSKU && stockCorrect) ? 'PASS' : 'FAIL'
    );

    return product._id;
  } else {
    logTest(
      'Product Management',
      'Create Product',
      'POST /api/products',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL',
      result.error?.error
    );
    return null;
  }
}

async function testProductList() {
  const result = await makeRequest('GET', '/products?page=1&limit=50');

  if (result.success && result.data?.success) {
    const hasProducts = result.data.data.length >= 0;
    const hasSummary = result.data.summary;

    logTest(
      'Product Management',
      'List Products',
      'GET /api/products',
      'List with summary stats',
      `${result.data.data.length} products, summary: ${hasSummary ? 'yes' : 'no'}`,
      hasSummary ? 'PASS' : 'FAIL'
    );
  } else {
    logTest(
      'Product Management',
      'List Products',
      'GET /api/products',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL'
    );
  }
}

async function testLowStockFilter() {
  const result = await makeRequest('GET', '/products?lowStock=true');

  if (result.success && result.data?.success) {
    logTest(
      'Product Management',
      'Low Stock Filter',
      'GET /api/products?lowStock=true',
      'Products with low stock',
      `${result.data.summary?.lowStockCount || 0} low stock items`,
      'PASS'
    );
  }
}

// ==================== CATEGORY TESTS ====================

async function testCategoryCreation() {
  console.log('\n=== TESTING CATEGORY MANAGEMENT ===');

  const categoryData = {
    name: "Test Medicine Category",
    description: "Test category for medicines",
    type: "medicine",
    defaultTaxRate: 12,
    defaultHsnCode: "30049099"
  };

  const result = await makeRequest('POST', '/categories', categoryData);

  if (result.success && result.data?.success) {
    const category = result.data.data;
    const hasSlug = category.slug;

    logTest(
      'Category Management',
      'Create Category',
      'POST /api/categories',
      'Category created with auto-generated slug',
      `Slug: ${category.slug}`,
      hasSlug ? 'PASS' : 'FAIL'
    );

    return category._id;
  } else {
    logTest(
      'Category Management',
      'Create Category',
      'POST /api/categories',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL',
      result.error?.error
    );
    return null;
  }
}

async function testCategoryList() {
  const result = await makeRequest('GET', '/categories');

  if (result.success && result.data?.success) {
    logTest(
      'Category Management',
      'List Categories',
      'GET /api/categories',
      'List of categories',
      `${result.data.data.length} categories found`,
      'PASS'
    );
  } else {
    logTest(
      'Category Management',
      'List Categories',
      'GET /api/categories',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL'
    );
  }
}

// ==================== STOCK MOVEMENT TESTS ====================

async function testStockMovementList() {
  console.log('\n=== TESTING STOCK MOVEMENTS ===');

  const result = await makeRequest('GET', '/stock-movements?page=1&limit=50');

  if (result.success && result.data?.success) {
    const hasTotals = result.data.totals;

    logTest(
      'Stock Movements',
      'List Stock Movements',
      'GET /api/stock-movements',
      'List with in/out totals',
      hasTotals ? 'Totals available' : 'No totals',
      hasTotals ? 'PASS' : 'FAIL'
    );
  } else {
    logTest(
      'Stock Movements',
      'List Stock Movements',
      'GET /api/stock-movements',
      'Success',
      `Failed: ${result.error?.error}`,
      'FAIL'
    );
  }
}

// ==================== RAZORPAY TESTS ====================

async function testRazorpayOrderCreation() {
  console.log('\n=== TESTING RAZORPAY INTEGRATION ===');

  const orderData = {
    amount: 500,
    currency: "INR",
    receipt: "rcpt_test_123",
    notes: {
      test: true
    }
  };

  const result = await makeRequest('POST', '/razorpay/create-order', orderData);

  if (result.success && result.data?.success) {
    const order = result.data.data;
    const hasOrderId = order.orderId;
    const hasKeyId = order.keyId;

    logTest(
      'Razorpay Integration',
      'Create Order',
      'POST /api/razorpay/create-order',
      'Order created with orderId and keyId',
      hasOrderId ? `Order: ${order.orderId}` : 'No order ID',
      (hasOrderId && hasKeyId) ? 'PASS' : 'FAIL',
      (hasOrderId && hasKeyId) ? null : 'Razorpay may not be configured'
    );

    return order.orderId;
  } else {
    logTest(
      'Razorpay Integration',
      'Create Order',
      'POST /api/razorpay/create-order',
      'Success or proper error',
      `${result.error?.error || 'Configuration issue'}`,
      'FAIL',
      'Razorpay not configured or credentials missing'
    );
    return null;
  }
}

async function testRazorpayVerification() {
  // This test requires actual Razorpay payment data
  // In real scenario, this would be tested with Razorpay test credentials

  logTest(
    'Razorpay Integration',
    'Verify Payment',
    'POST /api/razorpay/verify-payment',
    'Payment signature verification',
    'Skipped - requires actual payment data',
    'SKIP',
    'Requires valid Razorpay payment details'
  );
}

// ==================== CURRENCY TESTS ====================

async function testCurrencyHandling() {
  console.log('\n=== TESTING CURRENCY HANDLING ===');

  // Test invoice with decimal amounts
  const invoiceData = {
    customerName: "Currency Test",
    customerPhone: "+919876543214",
    items: [
      {
        type: "service",
        name: "Service with decimals",
        quantity: 1,
        unit: "session",
        unitPrice: 99.99,
        discount: 0,
        discountType: "fixed",
        taxRate: 18
      }
    ]
  };

  const result = await makeRequest('POST', '/invoices', invoiceData);

  if (result.success && result.data?.success) {
    const invoice = result.data.data;
    // 99.99 * 1.18 = 117.9882, rounded = 118
    const correctRounding = invoice.grandTotal === 118;

    logTest(
      'Currency Handling',
      'Decimal Amount Rounding',
      'Create invoice with decimal amount',
      'Proper rounding to nearest whole number',
      `Amount: 99.99, Grand Total: ${invoice.grandTotal}, Round-off: ${invoice.roundOff}`,
      correctRounding ? 'PASS' : 'FAIL'
    );
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  BILLING, INVOICES & PAYMENTS - COMPREHENSIVE TEST SUITE  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nStarting tests at:', new Date().toISOString());

  try {
    // Invoice Tests
    const invoiceId = await testInvoiceCreation();
    const paidInvoiceId = await testInvoiceWithPayment();
    await testInvoiceList(invoiceId);
    await testInvoiceUpdate(invoiceId);

    // Payment Tests
    await testPaymentCreation(invoiceId);
    await testPartialPayment();
    await testPaymentExceedsBalance();
    await testPaymentList();

    // Product Tests
    const productId = await testProductCreation();
    await testProductList();
    await testLowStockFilter();

    // Category Tests
    const categoryId = await testCategoryCreation();
    await testCategoryList();

    // Stock Movement Tests
    await testStockMovementList();

    // Razorpay Tests
    await testRazorpayOrderCreation();
    await testRazorpayVerification();

    // Currency Tests
    await testCurrencyHandling();

    // Final cleanup - cancel test invoice
    await testInvoiceCancel(invoiceId);

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }

  // Generate Report
  generateReport();
}

function generateReport() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST REPORT SUMMARY                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = TEST_RESULTS.filter(t => t.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(t => t.status === 'FAIL').length;
  const skipped = TEST_RESULTS.filter(t => t.status === 'SKIP').length;
  const total = TEST_RESULTS.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✓ Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
  console.log(`✗ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
  console.log(`- Skipped: ${skipped}`);

  // Group by module
  const byModule = {};
  TEST_RESULTS.forEach(result => {
    if (!byModule[result.module]) {
      byModule[result.module] = { pass: 0, fail: 0, skip: 0 };
    }
    if (result.status === 'PASS') byModule[result.module].pass++;
    else if (result.status === 'FAIL') byModule[result.module].fail++;
    else byModule[result.module].skip++;
  });

  console.log('\n--- Module Summary ---');
  Object.keys(byModule).forEach(module => {
    const stats = byModule[module];
    const total = stats.pass + stats.fail + stats.skip;
    console.log(`\n${module}:`);
    console.log(`  ✓ ${stats.pass}/${total} passed`);
    if (stats.fail > 0) console.log(`  ✗ ${stats.fail}/${total} failed`);
    if (stats.skip > 0) console.log(`  - ${stats.skip}/${total} skipped`);
  });

  // Failed tests detail
  if (failed > 0) {
    console.log('\n\n--- Failed Tests Details ---');
    TEST_RESULTS.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`\n✗ ${test.module} - ${test.testName}`);
      console.log(`  Action: ${test.action}`);
      console.log(`  Issue: ${test.issue || 'See details above'}`);
    });
  }

  console.log('\n\nTest completed at:', new Date().toISOString());
  console.log('\n════════════════════════════════════════════════════════════\n');
}

// Run tests
runAllTests().catch(console.error);
