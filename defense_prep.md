# Tài liệu chuẩn bị bảo vệ: Hệ thống Mycelium

**Đề tài:** "Xây dựng hệ thống quản lý tồn kho cho các cửa hàng sửa chữa thiết bị điện tử, điện thoại"  
**Tác giả:** Lê Chí Bằng (Bang.LC239112@sis.hust.edu.vn)  
**Ngày bảo vệ:** Tháng 1/2026

---

## 1. Các điểm trình bày chính

### 1.1 Vấn đề đặt ra
- Các hệ thống POS bán lẻ (KiotViet, POS365) thiếu quy trình sửa chữa chuyên biệt
- Không hỗ trợ định vị chi tiết linh kiện nhỏ (IC, ốc vít, chip)
- Ghi chép thủ công gây sai sót tại các cửa hàng nhỏ (1-5 nhân viên)
- Không tích hợp giữa phiếu sửa chữa và trừ kho tự động

### 1.2 Giải pháp (Điểm khác biệt)
- **Hướng dịch vụ:** Tích hợp vòng đời phiếu sửa chữa với kho (Tiếp nhận → Chẩn đoán → Báo giá → Sửa chữa → Tự động trừ kho)
- **Định vị CRB:** Kho → Cột → Hàng → Ô (grid cho linh kiện nhỏ)
- **Phân bổ mềm (Soft Allocation):** Trạng thái RESERVED ngăn trùng lặp khi chẩn đoán
- **Tách database:** `master_db` (nghiệp vụ) + `security_db` (xác thực/RBAC)

### 1.3 Quy mô kỹ thuật
| Chỉ số | Số lượng |
|--------|----------|
| Bảng dữ liệu | 51 |
| Views | 19 |
| Trang giao diện | 27 |
| Services backend | 33 |
| Route modules | 28 |

---

## 2. Câu hỏi dự đoán & Trả lời

### Nhóm A: Kiến trúc & Thiết kế

**Q1: Tại sao chọn kiến trúc 3-tier thay vì microservices?**
> Hệ thống nhắm đến cửa hàng nhỏ (1-5 nhân viên) với tài nguyên hạn chế. Kiến trúc 3-tier đơn giản hơn về deployment, monitoring và chi phí vận hành. Microservices sẽ over-engineering cho quy mô này.

**Q2: Giải thích việc tách database thành master_db và security_db?**
> Đây là mô hình Logical Isolation:
> - `master_db`: Dữ liệu nghiệp vụ (sản phẩm, tồn kho, phiếu sửa chữa)
> - `security_db`: Access control (người dùng, vai trò, policies Casbin, audit logs)
> 
> **Lợi ích:** Áp dụng chính sách backup nghiêm ngặt hơn cho security_db, dễ audit compliance, tách biệt risk profile.

**Q3: Soft Allocation hoạt động như thế nào?**
> Khi phụ tùng được chọn cho phiếu sửa chữa, status chuyển sang `RESERVED`. Phụ tùng vẫn ở vị trí vật lý nhưng không thể dùng cho phiếu khác. Chỉ khi phiếu `COMPLETED`, số lượng mới bị trừ chính thức. Tự động rollback nếu phiếu bị `CANCELLED`.

---

### Nhóm B: Triển khai kỹ thuật

**Q4: Xử lý race condition như thế nào khi nhiều người cùng lấy hàng?**
> Triển khai 3 cơ chế:
> 1. **Deadlock Retry Wrapper:** Exponential backoff (3 lần thử, delay cơ bản 100ms) cho MySQL Error 1213
> 2. **SELECT FOR UPDATE:** Lock row trước khi giảm số lượng
> 3. **Atomic Upsert-Decrement:** Lock nguồn → Validate → Giảm → Upsert đích

**Q5: Tại sao chọn MariaDB thay vì PostgreSQL hoặc MongoDB?**
> - MariaDB: Quen thuộc với các shop nhỏ (cài đặt đơn giản, công cụ phổ biến)
> - ACID compliance cho inventory transactions
> - Dễ học hơn PostgreSQL
> - Mô hình quan hệ phù hợp với dữ liệu kho có cấu trúc (so với MongoDB document-based)

**Q6: Giải thích hệ tọa độ CRB (Column-Row-Bin)?**
> Tiến hóa từ Zone-based trong đề cương:
> - **Đề cương:** Kho → Khu vực → Ô
> - **Triển khai:** Kho → Cột → Hàng → Ô (VD: WH1-C03-R07-B12)
> 
> **Lý do:** Độ chính xác cao hơn cho linh kiện siêu nhỏ. Một ngăn kéo có thể có 100+ ô cho IC/ốc vít.

---

### Nhóm C: Logic nghiệp vụ

**Q7: Safety Stock (tồn kho an toàn) được tính như thế nào?**
> Thuật toán dựa trên Z-score trong `RecommendationService.js`:
> - Tính độ lệch chuẩn của nhu cầu
> - Áp dụng hệ số service level (Z-score: 1.65 cho 95%)
> - Mức độ khẩn cấp động: Critical → High → Medium → Low (thay thế ABC tĩnh)

**Q8: FIFO được triển khai ra sao cho Lot Tracking?**
> `LotTrackingService.js` xử lý:
> - Mỗi lot có `received_date` và `expiry_date`
> - Khi xuất kho, query ORDER BY `received_date ASC` để lấy lot cũ nhất trước
> - Lot IDs cho truy xuất nguồn gốc (đặc biệt cho warranty claims)

**Q9: Mô tả vòng đời phiếu sửa chữa?**
> Tiếp nhận → Chẩn đoán → Báo giá → Khách duyệt → Đang sửa → Hoàn thành (Tự động trừ phụ tùng) → Giao máy/Bảo hành

---

### Nhóm D: So sánh & Lý giải

**Q10: So sánh với các hệ thống hiện có như KiotViet?**
> | Tính năng | KiotViet | Mycelium |
> |-----------|----------|----------|
> | Quy trình sửa chữa | ❌ Không có | ✅ Đầy đủ |
> | Định vị chi tiết | ❌ Zone-level | ✅ Bin-level (CRB) |
> | Phân bổ mềm | ❌ | ✅ Trạng thái Reserved |
> | Chẩn đoán kỹ thuật | ❌ | ✅ Tích hợp |
> | Đối tượng | Bán lẻ chung | Cửa hàng sửa chữa |

**Q11: Tại sao không dùng ERP có sẵn (Odoo, ERPNext)?**
> - Over-engineering: Quá nhiều module không cần thiết
> - Chi phí customization cao cho workflow sửa chữa
> - Không tối ưu cho micro-inventory (cấp độ IC)
> - Mycelium tập trung vào vertical niche: cửa hàng sửa chữa

---

### Nhóm E: Tiến hóa & Cải tiến

**Q12: Những thay đổi so với đề cương ban đầu?**
> | Đề cương (22/1) | Triển khai (31/1) | Lý do |
> |-----------------|-------------------|-------|
> | Bảng `warehouse_zones` | Loại bỏ | Làm phẳng phân cấp |
> | Zone → Bin | Column → Row → Bin | Độ chính xác cao hơn |
> | Phân tích ABC (tĩnh) | Dynamic Urgency | Dễ hành động hơn |
> | Nhiều bảng inventory | Bảng `product_inventory` thống nhất | Single source of truth |

**Q13: Có những hạn chế gì và hướng phát triển?**
> **Hạn chế:**
> - Tập trung đơn cửa hàng (chưa hỗ trợ chuỗi)
> - Chưa có mobile app
> - Báo cáo còn cơ bản
> 
> **Phát triển tương lai:**
> - Đồng bộ đa cửa hàng
> - Mobile PWA cho kỹ thuật viên
> - Dashboard phân tích nâng cao
> - Tích hợp cổng bảo hành nhà sản xuất

---

### Nhóm F: Bảo mật & Tuân thủ

**Q14: RBAC được triển khai như thế nào?**
> Casbin-based policy engine trong `security_db`:
> - Vai trò: Admin, Manager, Technician, Cashier
> - Quyền: Granular theo tài nguyên (VD: `inventory:read`, `repair:update`)
> - Audit logs cho mọi hành động nhạy cảm

**Q15: Xử lý dữ liệu nhạy cảm như thế nào?**
> - Mật khẩu: bcrypt hashing
> - Session: httpOnly cookies
> - Tách biệt logic giữa dữ liệu nghiệp vụ và bảo mật
> - Audit trail cho accountability

---

## 3. Câu hỏi khó có thể gặp

### Q: "Tại sao không viết tests đầy đủ?"
> Tập trung vào functional implementation cho deadline luận văn. Integration tests có trong `scripts/tests/`. Deployment production sẽ cần comprehensive test suite.

### Q: "Xử lý concurrency có đủ robust cho scale lớn?"
> Triển khai hiện tại xử lý được concurrency cấp shop (1-5 users). Với enterprise scale, cần thêm:
> - Message queuing (Redis/RabbitMQ)
> - Distributed locking
> - Horizontal scaling architecture

### Q: "Tại sao không dùng TypeScript?"
> Trade-off giữa tốc độ phát triển và type safety. JavaScript với JSDoc comments cho flexibility. TypeScript migration là improvement khả thi trong tương lai.

---

## 4. Checklist chuẩn bị Demo

- [ ] Khởi động servers: `npm run dev` (backend + frontend)
- [ ] Đăng nhập với tài khoản Admin
- [ ] Luồng demo:
  1. Tạo phiếu sửa chữa (Tiếp nhận)
  2. Chọn phụ tùng (demo Soft Allocation)
  3. Điều hướng CRB trong kho
  4. Hoàn thành phiếu (demo tự động trừ kho)
  5. Kiểm tra logs tồn kho
- [ ] Backup dữ liệu demo trước khi trình bày

---

## 5. Các chỉ số quan trọng cần nhớ

| Chỉ số | Giá trị |
|--------|---------|
| Mức độ khớp với đề cương | **4.9/5** |
| Bảng dữ liệu | 51 bảng + 19 views |
| Services | 33 orchestrators |
| Trang giao diện | 27 trang |
| Tech Stack | React 19 + Express 5 + MariaDB 11 |

---

## 6. Giải thích các câu truy vấn SQL quan trọng

### 6.1 Truy vấn tổng hợp tồn kho (Unified Stock Aggregation)

```sql
SELECT 
    s.product_id, s.device_name, s.device_maker,
    COALESCE(SUM(pi.quantity_on_hand), 0) as total_inventory
FROM specs_db s
LEFT JOIN product_inventory pi ON s.product_id = pi.product_id
WHERE 1=1
GROUP BY s.product_id 
ORDER BY s.device_maker, s.device_name
```

**Giải thích:**
- `LEFT JOIN`: Đảm bảo hiển thị cả sản phẩm chưa có tồn kho
- `COALESCE`: Xử lý NULL thành 0 khi sản phẩm không có inventory record
- `GROUP BY`: Tổng hợp tồn kho từ nhiều kho/bin về một record duy nhất

### 6.2 Truy vấn thống kê phân bố theo Bin (Zone Status)

```sql
SELECT 
    COALESCE(w.name, 'Unknown') as warehouse_name,
    COALESCE(b.bin_code, 'Unassigned') as bin_code,
    pi.condition_status as status,
    SUM(pi.quantity_on_hand) as count
FROM product_inventory pi
LEFT JOIN warehouses w ON pi.warehouse_id = w.warehouse_id
LEFT JOIN bin_locations b ON pi.bin_id = b.bin_id
WHERE pi.quantity_on_hand > 0
GROUP BY w.name, b.bin_code, pi.condition_status
```

**Giải thích:**
- **Defensive coding:** `COALESCE` ngăn hiển thị "undefined" trên UI
- **Filtering:** `quantity_on_hand > 0` loại bỏ records rỗng
- **Multi-dimension grouping:** Phân nhóm theo 3 chiều (Warehouse, Bin, Status)

### 6.3 Truy vấn khóa dòng để ngăn race condition

```sql
SELECT quantity_on_hand FROM product_inventory 
WHERE product_id = ? AND warehouse_id = ? AND bin_id = ? 
FOR UPDATE
```

**Giải thích:**
- `FOR UPDATE`: **Pessimistic locking** - khóa row cho đến khi transaction commit
- Các transaction khác phải đợi hoặc bị timeout
- Đảm bảo atomic read-modify-write pattern

---

## 7. Giải thích các đoạn mã quan trọng

### 7.1 Cơ chế Deadlock Retry (Exponential Backoff)

```javascript
async _withDeadlockRetry(operation, operationName = 'transaction') {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const isDeadlock = error.code === 'ER_LOCK_DEADLOCK' || 
                               error.errno === 1213;
            
            if (isDeadlock && attempt < this.maxRetries) {
                // Exponential backoff: 100ms → 200ms → 400ms
                const delay = this.retryDelay * Math.pow(2, attempt - 1);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
}
```

**Giải thích:**
- **Wrapper pattern:** Bọc mọi transaction quan trọng
- **Exponential backoff:** Delay tăng gấp đôi mỗi lần thử (100ms → 200ms → 400ms)
- **Error detection:** Nhận diện MySQL Error 1213 (Deadlock)
- **Graceful degradation:** Throw sau n lần thử thất bại

### 7.2 Atomic Upsert Pattern (Nhập kho)

```javascript
await conn.query(`
    INSERT INTO product_inventory 
    (warehouse_id, product_id, quantity_on_hand, condition_status)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
        quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand),
        updated_at = NOW()
`, [warehouseId, productId, quantity, condition]);
```

**Giải thích:**
- **Upsert pattern:** INSERT nếu chưa có, UPDATE nếu đã tồn tại
- **Atomic increment:** `quantity_on_hand + VALUES(...)` đảm bảo không mất dữ liệu khi concurrent
- **Tự động timestamp:** `updated_at = NOW()` cho audit trail

### 7.3 Transaction Boundary Pattern

```javascript
const conn = await this.masterPool.getConnection();
try {
    await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await conn.beginTransaction();
    
    // ... business logic ...
    
    await conn.commit();
    return result;
} catch (err) {
    await conn.rollback();
    throw new Error(`Transaction failed: ${err.message}`);
} finally {
    conn.release();
}
```

**Giải thích:**
- **Isolation level:** READ COMMITTED cân bằng giữa consistency và performance
- **Try-catch-finally:** Đảm bảo rollback khi lỗi, release connection mọi trường hợp
- **Connection pooling:** `getConnection()` / `release()` tái sử dụng connections

### 7.4 FIFO Lot Consumption (Xuất kho)

```javascript
// Frontend gửi fifoLots đã sắp xếp theo received_date ASC
if (fifoLots && Array.isArray(fifoLots)) {
    for (const lot of fifoLots) {
        if (remainingQty <= 0) break;
        
        const qtyToUse = Math.min(lot.quantity_to_use, remainingQty);
        // Decrement từ lot cũ nhất trước
        await decrementFromLot(conn, lot.lot_id, qtyToUse);
        remainingQty -= qtyToUse;
    }
}
```

**Giải thích:**
- **FIFO logic:** Lots được sắp xếp theo `received_date ASC` từ query
- **Partial consumption:** Có thể lấy một phần từ lot, không bắt buộc lấy hết
- **Traceability:** Ghi log lot_id nào đã được sử dụng cho warranty claims

---

## 8. Quy tắc nghiệp vụ & Vòng đời trạng thái (từ Báo cáo ĐATN)

### 8.1 Quy tắc tồn kho (BR-INV)

| Mã | Quy tắc |
|----|---------|
| BR-INV-01 | Số lượng tồn kho không được âm (`quantity ≥ 0`) |
| BR-INV-02 | Xuất kho không được vượt quá số lượng khả dụng |
| BR-INV-03 | Serial number phải duy nhất toàn hệ thống |
| BR-INV-04 | Batch number phải duy nhất trong cùng một sản phẩm |
| BR-INV-05 | Mặc định sử dụng FIFO cho xuất kho batch |

### 8.2 Vòng đời RMA (Return Merchandise Authorization)

```
PENDING → RECEIVING → IN_INSPECTION → DISPOSITION → COMPLETED
```

| Trạng thái | Mô tả | Điều kiện chuyển |
|------------|-------|------------------|
| PENDING | Yêu cầu RMA đã tạo | → RECEIVING: Khi nhận hàng đầu tiên |
| RECEIVING | Đang tiếp nhận hàng trả về | → IN_INSPECTION: Tất cả items đã nhận |
| IN_INSPECTION | Đang kiểm tra chất lượng | → DISPOSITION: Hoàn tất inspection |
| DISPOSITION | Đã xác định phương án xử lý | → COMPLETED: Tất cả items đã xử lý |
| COMPLETED | RMA đã đóng | Trạng thái kết thúc |
| REJECTED | Từ chối yêu cầu | Từ IN_INSPECTION nếu không hợp lệ |
| CANCELLED | Đã hủy | Có thể hủy từ PENDING, RECEIVING |

**Phương án xử lý (Disposition):**
- **RESTOCK:** Trả hàng về kho bán, cập nhật tồn kho tăng
- **REFURBISH:** Tạo công việc sửa chữa, sau đó RESTOCK
- **SCRAP:** Hủy hàng, ghi nhận chi phí tổn thất

### 8.3 Vòng đời Repair Job (Phiếu sửa chữa)

```
PENDING → DIAGNOSED → PARTS_ORDERED → IN_PROGRESS → COMPLETED
```

| Trạng thái | Mô tả | Điều kiện chuyển |
|------------|-------|------------------|
| PENDING | Tiếp nhận, chờ chẩn đoán | → DIAGNOSED: Sau khi kiểm tra |
| DIAGNOSED | Đã xác định lỗi và báo giá | → PARTS_ORDERED: Nếu cần linh kiện |
|  |  | → IN_PROGRESS: Nếu không cần |
| PARTS_ORDERED | Đang chờ linh kiện | → IN_PROGRESS: Linh kiện đã về |
| IN_PROGRESS | Đang sửa chữa | → COMPLETED: Hoàn thành |
| COMPLETED | Đã hoàn thành | Trạng thái kết thúc |
| CANCELLED | Đã hủy | Có thể hủy từ bất kỳ trạng thái |

### 8.4 Vòng đời Serialized Inventory (Hàng theo serial)

```
AVAILABLE → RESERVED → SOLD → RETURNED → AVAILABLE/SCRAPPED
```

### 8.5 Công thức tính Khuyến nghị đặt hàng

**Reorder Point (Điểm đặt hàng lại):**
```
ReorderPoint = (Trung bình tiêu thụ/ngày × Lead Time) + Safety Stock
```

**Safety Stock (Tồn kho an toàn):**
```
SafetyStock = Z-score × σ(demand) × √(Lead Time)
```
- Z-score = 1.65 (cho mức độ phục vụ 95%)
- σ(demand) = Độ lệch chuẩn nhu cầu

**Dynamic Urgency (Mức độ khẩn cấp):**
| Level | Điều kiện |
|-------|-----------|
| CRITICAL | quantity ≤ 0 |
| HIGH | quantity < SafetyStock |
| MEDIUM | quantity < ReorderPoint |
| LOW | quantity ≥ ReorderPoint |

---

*Chuẩn bị: 31/01/2026*
