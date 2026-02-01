import React from 'react';
import { Table } from 'react-bootstrap';
import './StockIssueSlip.css';

/**
 * Stock Issue Slip (Phiếu Xuất Kho) - Printable document for outgoing stock
 * Following Circular 99/2025/TT-BTC dated October 27, 2025
 * Form No. 02-VT
 */
const StockIssueSlip = ({ transaction, items }) => {
    // Helper to read number to words (Simplified for now, or use a library if available)
    // For now, we will leave it as a placeholder or simple implementation
    const readNumber = (_num) => {
        return "................................................................"; // Placeholder
    };

    const formatDate = (dateString) => {
        if (!dateString) return { day: '....', month: '.....', year: '....' };
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear()
        };
    };

    const date = new Date(transaction.transaction_date || new Date());
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const invoiceDate = transaction.invoice_date ? formatDate(transaction.invoice_date) : null;

    // Determine Recipient
    // If it's a return (has supplier), use supplier name.
    // Otherwise check notes or default.
    const recipientName = transaction.customer_name || transaction.contact_person || "................................";
    const recipientDept = transaction.customer_address || transaction.department || "................................";
    const reason = transaction.notes || "Sale / Internal Use";
    const warehouseName = items[0]?.warehouse_name || transaction.warehouse_name || "................................";
    const warehouseLocation = transaction.warehouse_location || items[0]?.zone_name || "................................";

    // Calculated Totals
    const totalAmount = transaction.total_amount || 0;

    return (
        <div className="stock-issue-slip">
            <div className="slip-header">
                <div className="unit-info">
                    <div><strong>Đơn vị:</strong> Mycelium Technology Co., Ltd</div>
                    <div><strong>Bộ phận:</strong> ........................................</div>
                </div>
                <div className="slip-meta text-end">
                    <div className="fw-bold">Mẫu số: 02 - VT</div>
                    <div className="small font-italic">(Kèm theo Thông tư số 99/2025/TT-BTC</div>
                    <div className="small font-italic">ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)</div>
                </div>
            </div>

            <div className="slip-title text-center mt-4">
                <h2 className="fw-bold">PHIẾU XUẤT KHO</h2>
                <div className="font-italic">Ngày {day} tháng {month} năm {year}</div>
            </div>

            <div className="slip-accounts-section mt-2">
                <div className="row">
                    <div className="col text-end">
                        <div>Số: {transaction.receipt_id || '……..….'}</div>
                        <div>Nợ: ....................</div>
                        <div>Có: ....................</div>
                    </div>
                </div>
            </div>

            <div className="slip-body mt-3">
                <div className="mb-2">
                    - Họ và tên người nhận hàng: <span className="data-field">{recipientName}</span>
                    <span className="ms-4">Địa chỉ (bộ phận): <span className="data-field">{recipientDept}</span></span>
                </div>
                <div className="mb-2">
                    - Lý do xuất kho: <span className="data-field">{reason}</span>
                </div>
                <div className="mb-2">
                    - Xuất tại kho (ngăn lô): <span className="data-field">{warehouseName}</span>
                    <span className="ms-4">Địa điểm: <span className="data-field">{warehouseLocation}</span></span>
                </div>

                <table className="table table-bordered border-dark mt-3 text-center align-middle">
                    <thead>
                        <tr>
                            <th rowSpan="2" style={{ width: '50px' }}>STT</th>
                            <th rowSpan="2">Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hóa</th>
                            <th rowSpan="2" style={{ width: '80px' }}>Mã số</th>
                            <th rowSpan="2" style={{ width: '60px' }}>Đơn vị tính</th>
                            <th colSpan="2">Số lượng</th>
                            <th rowSpan="2" style={{ width: '100px' }}>Đơn giá</th>
                            <th rowSpan="2" style={{ width: '120px' }}>Thành tiền</th>
                        </tr>
                        <tr>
                            <th style={{ width: '80px' }}>Yêu cầu</th>
                            <th style={{ width: '80px' }}>Thực xuất</th>
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
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td className="text-start">
                                    {item.device_name || item.product_name}
                                    {item.device_maker && <small className="d-block text-muted">{item.device_maker}</small>}
                                    {item.serial_number && <small className="d-block text-muted">SN: {item.serial_number}</small>}
                                    {item.bin_code && <small className="d-block text-muted">Bin: {item.bin_code}</small>}
                                </td>
                                <td>{item.product_id}</td>
                                <td>{item.unit || 'Unit'}</td>
                                <td>{item.quantity}</td>
                                <td>{item.quantity}</td>
                                <td className="text-end">{Number(item.unit_cost || item.unit_price || 0).toLocaleString()}</td>
                                <td className="text-end">{Number(item.total_cost || item.total_amount || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                        {/* Empty rows to fill space if needed */}
                        {items.length < 5 && Array(5 - items.length).fill(0).map((_, i) => (
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
                        <tr>
                            <td colSpan="4" className="fw-bold">Cộng</td>
                            <td>x</td>
                            <td>x</td>
                            <td>x</td>
                            <td className="fw-bold text-end">{Number(totalAmount).toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mb-2">
                    - Tổng số tiền (viết bằng chữ): <span className="font-italic">{readNumber(totalAmount)}</span>
                </div>
                <div className="mb-2">
                    - Số chứng từ gốc kèm theo: {transaction.po_number ? `PO số ${transaction.po_number}` : transaction.invoice_number ? `Invoice số ${transaction.invoice_number}${invoiceDate ? ` ngày ${invoiceDate.day} tháng ${invoiceDate.month} năm ${invoiceDate.year}` : ''}` : '.................................................................'}
                </div>
            </div>

            <div className="slip-footer mt-4">
                <div className="row text-center">
                    <div className="col">
                        <div className="fw-bold">Người lập phiếu</div>
                        <div className="font-italic small">(Ký, họ tên)</div>
                        <div style={{ height: '100px' }}></div>
                    </div>
                    <div className="col">
                        <div className="fw-bold">Người nhận hàng</div>
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
                    <div className="col">
                        <div className="font-italic mb-1">Ngày {day} tháng {month} năm {year}</div>
                        <div className="fw-bold">Giám đốc</div>
                        <div className="font-italic small">(Ký, họ tên)</div>
                        <div style={{ height: '100px' }}></div>
                    </div>
                </div>
                
                <div className="mt-3">
                    <p className="small font-italic">
                        Ghi chú: Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình, 
                        doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StockIssueSlip;
