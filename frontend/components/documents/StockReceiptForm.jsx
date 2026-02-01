import React from 'react';
import './StockReceiptForm.css';

/**
 * Stock Receipt Form (Phiếu Nhập Kho) - Printable document for incoming stock
 * Following Circular 99/2025/TT-BTC dated October 27, 2025
 * Form No. 01-VT
 */
const StockReceiptForm = ({ receipt, companyInfo }) => {
  const formatDate = (dateString) => {
    if (!dateString) return { day: '....', month: '.....', year: '....' };
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const numberToWords = (num) => {
    // Placeholder for Vietnamese number to words conversion
    return "................................................................";
  };

  const defaultCompanyInfo = {
    name: companyInfo?.name || 'Mycelium Technology Co., Ltd',
    department: companyInfo?.department || '........................................',
  };

  if (!receipt) {
    return <div className="stock-receipt-form">No receipt data available</div>;
  }

  const date = formatDate(receipt.transaction_date);
  const invoiceDate = receipt.invoice_date ? formatDate(receipt.invoice_date) : null;
  const totalAmount = receipt.totals?.total_amount || 0;

  return (
    <div className="stock-receipt-form">
      {/* Header */}
      <div className="receipt-header">
        <div className="unit-info">
          <div><strong>Đơn vị:</strong> {defaultCompanyInfo.name}</div>
          <div><strong>Bộ phận:</strong> {defaultCompanyInfo.department}</div>
        </div>
        <div className="form-meta text-end">
          <div className="fw-bold">Mẫu số: 01 - VT</div>
          <div className="small font-italic">(Kèm theo Thông tư số 99/2025/TT-BTC</div>
          <div className="small font-italic">ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)</div>
        </div>
      </div>

      {/* Receipt Information */}
      <div className="receipt-title text-center mt-4">
        <h2 className="fw-bold">PHIẾU NHẬP KHO / STOCK IN (GRN)</h2>
        <div className="font-italic">Ngày {date.day} tháng {date.month} năm {date.year}</div>
      </div>

      <div className="receipt-info-section mt-3">
        <div className="row">
          <div className="col text-end">
            <div>Số: {receipt.receipt_id || '……..….'}</div>
            <div>Nợ: ….….….</div>
            <div>Có: …….…..</div>
          </div>
        </div>

        <div className="info-row mt-3">
          <div>
            - Họ và tên người giao: <span className="data-field">{receipt.supplier_contact || receipt.supplier_name || '................................'}</span>
          </div>
        </div>

        <div className="info-row">
          <div>
            - Theo {receipt.po_number ? `PO số ${receipt.po_number}` : receipt.invoice_number ? `Invoice số ${receipt.invoice_number}${invoiceDate ? ` ngày ${invoiceDate.day} tháng ${invoiceDate.month} năm ${invoiceDate.year}` : ''}` : '…………………… số ....... ngày …… tháng …. năm ……'} của {receipt.supplier_name || '................................'}
          </div>
        </div>

        <div className="info-row">
          <div>
            Nhập tại kho: <span className="data-field">{receipt.warehouse_name || '………………………………….'}</span> địa điểm <span className="data-field">{receipt.warehouse_location || receipt.zone_name || '................................'}</span>
            {receipt.items?.[0]?.bin_code && (
              <span className="ms-2">Ngăn/lô: <span className="data-field">{receipt.items[0].bin_code}{receipt.items[0].bin_location ? ` (${receipt.items[0].bin_location})` : ''}</span></span>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="table table-bordered border-dark mt-3 text-center align-middle items-table">
        <thead>
          <tr>
            <th rowSpan="2" style={{ width: '50px' }}>STT</th>
            <th rowSpan="2">Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ sản phẩm, hàng hóa</th>
            <th rowSpan="2" style={{ width: '80px' }}>Mã số</th>
            <th rowSpan="2" style={{ width: '60px' }}>Đơn vị tính</th>
            <th colSpan="2">Số lượng</th>
            <th rowSpan="2" style={{ width: '100px' }}>Đơn giá</th>
            <th rowSpan="2" style={{ width: '120px' }}>Thành tiền</th>
          </tr>
          <tr>
            <th style={{ width: '80px' }}>Theo chứng từ</th>
            <th style={{ width: '80px' }}>Thực nhập</th>
          </tr>
          <tr>
            <th>A</th>
            <th>B</th>
            <th>C</th>
            <th>D</th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items && receipt.items.map((item, index) => (
            <tr key={item.log_id || index}>
              <td>{index + 1}</td>
              <td className="text-start">
                {item.product_name || 'N/A'}
                {item.product_maker && <small className="d-block text-muted">{item.product_maker}</small>}
                {item.serial_number && <small className="d-block text-muted">S/N: {item.serial_number}</small>}
                {item.batch_no && <small className="d-block text-muted">Batch: {item.batch_no}</small>}
                {item.bin_code && <small className="d-block text-muted">Bin: {item.bin_code}</small>}
              </td>
              <td>{item.product_id || '-'}</td>
              <td>{item.unit || 'Unit'}</td>
              <td>{item.quantity || 0}</td>
              <td>{item.quantity || 0}</td>
              <td className="text-end">{formatCurrency(item.unit_cost)}</td>
              <td className="text-end">{formatCurrency(item.total_amount)}</td>
            </tr>
          ))}
          {/* Empty rows to fill space if needed */}
          {receipt.items && receipt.items.length < 5 && Array(5 - receipt.items.length).fill(0).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td colSpan="4" className="fw-bold">Cộng</td>
            <td>x</td>
            <td>x</td>
            <td>x</td>
            <td className="text-end fw-bold">{formatCurrency(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Notes and Summary */}
      <div className="receipt-summary mt-3">
        <div className="mb-2">
          - Tổng số tiền (viết bằng chữ): <span className="font-italic">{numberToWords(totalAmount)}</span>
        </div>
        <div className="mb-2">
          - Số chứng từ gốc kèm theo: {receipt.po_number || receipt.invoice_number || '.................................................................'}
        </div>
      </div>

      {/* Signatures */}
      <div className="signatures-section mt-4">
        <div className="row text-center">
          <div className="col text-end" style={{ marginBottom: '-20px' }}>
            <div className="font-italic">Ngày {date.day} tháng {date.month} năm {date.year}</div>
          </div>
        </div>
        <div className="row text-center mt-2">
          <div className="col">
            <div className="fw-bold">Người lập phiếu</div>
            <div className="font-italic small">(Ký, họ tên)</div>
            <div style={{ height: '100px' }}></div>
          </div>
          <div className="col">
            <div className="fw-bold">Người giao hàng</div>
            <div className="font-italic small">(Ký, họ tên)</div>
            <div style={{ height: '100px' }}></div>
          </div>
          <div className="col">
            <div className="fw-bold">Thủ kho</div>
            <div className="font-italic small">(Ký, họ tên)</div>
            <div style={{ height: '100px' }}></div>
          </div>
          <div className="col">
            <div className="fw-bold">Kế toán trưởng</div>
            <div className="font-italic small">(Hoặc bộ phận có nhu cầu nhập)</div>
            <div className="font-italic small">(Ký, họ tên)</div>
            <div style={{ height: '80px' }}></div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="receipt-footer mt-3">
        <p className="small font-italic">
          Ghi chú: Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình,
          doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.
        </p>
      </div>
    </div>
  );
};

export default StockReceiptForm;
