import React from 'react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasePage } from './pages/PurchasePage';
import { StockTransferPage } from './pages/StockTransferPage';
import { DamageDefectPage } from './pages/DamageDefectPage';
import { SalesReturnPage } from './pages/SalesReturnPage';
import { PurchaseReturnPage } from './pages/PurchaseReturnPage';
import { AccountsPage } from './pages/AccountsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountSettingsPage } from './pages/AccountSettingsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { PhysicalStockPage } from './pages/PhysicalStockPage';
import { ProformaInvoicePage } from './pages/ProformaInvoicePage';
import { QuotationPage } from './pages/QuotationPage';
import { ThemesPage } from './pages/ThemesPage';
import { LedgerMasterPage } from './pages/LedgerMasterPage';
import { SupplierMasterPage } from './pages/SupplierMasterPage';
import { BranchesPage } from './pages/BranchesPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { DailyTaskPage } from './pages/DailyTaskPage';
import { ItemMastersPage } from './pages/ItemMastersPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Root',                 path: '/',                       element: <Navigate to="/dashboard" replace />, public: false },
  { name: 'Login',                path: '/login',                  element: <LoginPage />,              public: true },
  { name: 'Reset Password',       path: '/reset-password',         element: <ResetPasswordPage />,      public: true },
  { name: 'Dashboard',            path: '/dashboard',              element: <DashboardPage /> },
  { name: 'Item Master',          path: '/products',               element: <ProductsPage /> },
  { name: 'Item Masters',         path: '/item-masters',           element: <ItemMastersPage /> },
  { name: 'Inventory',            path: '/inventory',              element: <InventoryPage /> },
  { name: 'Sales',                path: '/sales',                  element: <SalesPage /> },
  { name: 'Purchase',             path: '/purchase',               element: <PurchasePage /> },
  { name: 'Stock Transfer',       path: '/stock-transfer',         element: <StockTransferPage /> },
  { name: 'Damage & Defect',      path: '/damage-defect',          element: <DamageDefectPage /> },
  { name: 'Sales Return',         path: '/sales-return',           element: <SalesReturnPage /> },
  { name: 'Purchase Return',      path: '/purchase-return',        element: <PurchaseReturnPage /> },
  { name: 'Physical Stock',       path: '/physical-stock',         element: <PhysicalStockPage /> },
  { name: 'Proforma Invoice',     path: '/proforma',               element: <ProformaInvoicePage /> },
  { name: 'Quotation',            path: '/quotation',              element: <QuotationPage /> },
  { name: 'Themes',               path: '/themes',                 element: <ThemesPage />, public: true },
  { name: 'Accounts',             path: '/accounts',               element: <Navigate to="/accounts/chart" replace /> },
  { name: 'Chart of Accounts',    path: '/accounts/chart',         element: <AccountsPage /> },
  { name: 'Ledger',               path: '/accounts/ledger',        element: <AccountsPage /> },
  { name: 'Journal Entry',        path: '/accounts/journal',       element: <AccountsPage /> },
  { name: 'Payment Voucher',      path: '/accounts/payment',       element: <AccountsPage /> },
  { name: 'Receipt Voucher',      path: '/accounts/receipt',       element: <AccountsPage /> },
  { name: 'Contra Voucher',       path: '/accounts/contra',        element: <AccountsPage /> },
  { name: 'Debit Note',           path: '/accounts/debit-note',    element: <AccountsPage /> },
  { name: 'Credit Note',          path: '/accounts/credit-note',   element: <AccountsPage /> },
  { name: 'Balance Sheet',        path: '/accounts/balance-sheet', element: <AccountsPage /> },
  { name: 'Profit & Loss',        path: '/accounts/pnl',           element: <AccountsPage /> },
  { name: 'Settings',             path: '/settings',               element: <SettingsPage /> },
  { name: 'Account Settings',     path: '/profile',                element: <AccountSettingsPage /> },
  { name: 'Change Password',      path: '/change-password',        element: <ChangePasswordPage /> },
  // Ledger master pages — dedicated page, NOT redirected to settings
  { name: 'Supplier Master',      path: '/ledger/suppliers',       element: <SupplierMasterPage /> },
  { name: 'Ledger Customers',     path: '/ledger/customers',       element: <LedgerMasterPage /> },
  // User management pages — dedicated UserManagementPage
  { name: 'Users Create',         path: '/users/create',           element: <UserManagementPage /> },
  { name: 'Users Manage',         path: '/users/manage',           element: <UserManagementPage /> },
  { name: 'Users Rights',         path: '/users/rights',           element: <UserManagementPage /> },
  { name: 'Branches & Warehouses', path: '/branches',            element: <BranchesPage /> },
  // Purchase Order (alias to purchase)
  { name: 'Purchase Order',       path: '/purchase-order',         element: <PurchasePage /> },
  { name: 'Daily Tasks',          path: '/daily-tasks',            element: <Navigate to="/daily-tasks/submit" replace /> },
  { name: 'Daily Task Submit',    path: '/daily-tasks/submit',     element: <DailyTaskPage /> },
  { name: 'Daily Task Reports',   path: '/daily-tasks/reports',    element: <DailyTaskPage /> },
  { name: 'Daily Task Masters',   path: '/daily-tasks/masters',    element: <DailyTaskPage /> },
];
