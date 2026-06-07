# TÀI LIỆU YÊU CẦU NGHIỆP VỤ & KỸ THUẬT (REWRITTEN)
## DỰ ÁN: TRANG WEB CẤU HÌNH & BÁN POKÉMON CHAMPIONS (HỖ TRỢ GEN 7 ĐỔ LẠI)

---

## I. MỤC TIÊU & PHẠM VI DỰ ÁN (PROJECT SCOPE)

Dự án này hướng tới việc xây dựng một trang web mua bán (Shop) Pokémon tùy chỉnh. Thay vì tự động hóa giao dịch qua máy chủ Nintendo (GTS Bot) phức tạp và dễ bị cấm (ban), dự án chuyển sang mô hình **hoàn tất đơn hàng thủ công (Manual Fulfillment)** kết hợp với việc kiểm tra tính hợp lệ tự động bằng thư viện **PKHeX.Core** trên Server.

### 1. Luồng hoạt động chính:
- **Khách hàng** truy cập website, duyệt danh sách Pokémon Champions (đã được lọc từ Gen 7 trở xuống).
- Khách hàng tùy chọn các thông số Pokémon (Species, Ability, Nature, Moves, IVs/EVs, Shiny, Held Item, Trainer Info).
- Hệ thống gửi yêu cầu kiểm tra tính hợp lệ (**Legality Check**) trực tiếp tới backend.
- Sau khi hợp lệ, khách hàng thêm Pokémon vào giỏ hàng và tiến hành tạo đơn (nhập Tên khách, Thông tin liên lạc). Giá trị đơn hàng sẽ tự động tính theo cấu hình giá bán lẻ (Retail) hoặc bán sỉ (Wholesale) do Admin thiết lập.
- **Hệ thống** sẽ sinh ra các tệp nhị phân dữ liệu Pokémon dạng `.pk7` (định dạng của Gen 7) và lưu trực tiếp vào cơ sở dữ liệu kèm theo đơn hàng.
- **Admin** truy cập trang quản trị (Admin Dashboard), duyệt đơn hàng, tải về file `.zip` chứa toàn bộ tệp `.pk7` của đơn hàng đó.
- **Quy trình giao Pokémon thủ công**: Admin sử dụng máy Nintendo 3DS hack, dùng ứng dụng quản lý save (như Checkpoint/JKSM hoặc PKSM) để nạp các file `.pk7` vào game Pokémon Gen 7 (như Ultra Sun/Ultra Moon), sau đó dùng **Pokémon Bank** phối hợp với mã **Moving Key** từ **Pokémon HOME** của khách hàng để chuyển Pokémon trực tiếp lên tài khoản Pokémon HOME của họ.

---

## II. KIẾN TRÚC HỆ THỐNG RÚT GỌN (SIMPLIFIED ARCHITECTURE)

Để tối ưu hóa chi phí và đơn giản hóa vận hành, toàn bộ các công nghệ phức tạp cũ như **Redis**, **BullMQ** (Hàng chờ giao dịch tự động), **GTS Network Emulation** (Giả lập giao thức mạng Nintendo) và **NestJS** (đóng vai trò trung gian) đều bị **LOẠI BỎ**.

Hệ thống mới chỉ sử dụng 2 thành phần cốt lõi:

```
+----------------------------------------+
|       Web Frontend (Next.js / React)   |  <--- Giao diện chọn Pokémon, nặn chỉ số,
+----------------------------------------+       tính tiền giỏ hàng, trang Admin duyệt đơn
                    │
            (HTTP REST API)
                    ▼
+----------------------------------------+
|   Backend API (ASP.NET Core - C#)      |  <--- Chứa trực tiếp lõi PKHeX.Core để validate
+----------------------------------------+       và xuất file .pk7; Quản lý CRUD Đơn hàng & Giá
                    │
             (Database Query)
                    ▼
+----------------------------------------+
|        Database (PostgreSQL)           |  <--- Lưu Pokédex, Đơn hàng (kèm byte file .pk7),
+----------------------------------------+       và cấu hình giá bán lẻ / bán sỉ.
```

### 1. Tại sao sử dụng ASP.NET Core (C#) làm Backend chính?
- Thư viện kiểm tra tính hợp lệ Pokémon tốt nhất hiện nay là **PKHeX.Core** viết bằng ngôn ngữ **C# (.NET)**.
- Thay vì sử dụng NestJS (NodeJS) rồi phải giao tiếp qua một Worker C# riêng biệt thông qua Queue, việc sử dụng trực tiếp **ASP.NET Core Web API** làm backend duy nhất giúp gọi trực tiếp thư viện `PKHeX.Core` bằng NuGet một cách mượt mà, đồng thời quản lý trực tiếp PostgreSQL. Cấu trúc này giảm thiểu số lượng server cần chạy từ 4 xuống còn 2.

---

## III. HIỂU BIẾT NGHIỆP VỤ & QUY TRÌNH CHUYỂN POKÉMON (BUSINESS DOMAIN)

Để vận hành hệ thống này, cần hiểu rõ các khái niệm và công cụ phần cứng/phần mềm sau:

### 1. Pokémon Gen 7 trở xuống (Generation 7 and below)
- Gồm các Pokémon có số thứ tự National Pokédex từ **1 đến 809** (từ Bulbasaur đến Melmetal).
- Các game hệ 3DS thuộc Gen 7 (Sun, Moon, Ultra Sun, Ultra Moon) lưu trữ cấu trúc Pokémon dưới dạng file nhị phân **`.pk7`** (độ dài 232 bytes).
- **Lưu ý đặc biệt**: Các dạng vùng miền đặc biệt (Regional Forms) ra mắt sau Gen 7 (như dạng Galar từ Gen 8, dạng Hisui từ Legends: Arceus, dạng Paldea từ Gen 9) dù có số National Dex thuộc Gen 7 trở xuống (ví dụ: Slowbro có số Dex là 80, nhưng dạng Galar của nó chỉ xuất hiện từ Gen 8) **KHÔNG ĐƯỢC CHẤP NHẬN** vì game Gen 7 trên 3DS không chứa dữ liệu của các dạng này.

### 2. Nintendo 3DS Hack & PKSM / Save Manager
- **3DS Hack**: Thiết bị chơi game Nintendo 3DS được cài đặt Custom Firmware (Luma3DS) để chạy ứng dụng Homebrew bên thứ ba.
- **Checkpoint / JKSM**: Công cụ homebrew cho phép kết xuất (dump) tệp save của trò chơi (Ultra Sun/Moon) ra thẻ nhớ SD dưới dạng file `main`, sau đó cắm thẻ nhớ vào PC để mở save bằng phần mềm **PKHeX (PC)**, kéo thả các file `.pk7` vào các ô chứa trong box, lưu lại save rồi khôi phục (restore) lại vào máy 3DS.
- **PKSM**: Một ứng dụng homebrew cực kỳ mạnh mẽ chạy trực tiếp trên 3DS. Nó có tính năng lưu trữ Pokémon ngoại tuyến (Offline Bank) và hỗ trợ tính năng **Inject** trực tiếp tệp `.pk7` nằm trong thư mục `/3ds/PKSM/inject/` trên thẻ nhớ SD hoặc thông qua giao thức truyền dữ liệu nội bộ không dây vào thẳng file save của game hoặc box lưu trữ của PKSM mà không cần tháo thẻ nhớ ra PC.

### 3. Quy trình chuyển Pokémon từ Pokémon Bank lên Pokémon HOME
- **Pokémon Bank**: Dịch vụ lưu trữ đám mây chính thức của Nintendo trên 3DS. Cho phép chuyển Pokémon từ các trò chơi Gen 6, Gen 7 trên 3DS vào Bank.
- **Pokémon HOME**: Dịch vụ lưu trữ Pokémon thế hệ mới trên Nintendo Switch và điện thoại.
- **Cơ chế Transfer (Moving Key)**:
  1. Trên app Pokémon HOME (điện thoại hoặc máy Switch) của Khách hàng, chọn tính năng **"Options" -> "Move Pokémon from Nintendo 3DS"**.
  2. Hệ thống Pokémon HOME sẽ tạo ra một mã bảo mật gồm 16 ký tự viết hoa (gọi là **Moving Key**) và có hiệu lực trong **3 phút**.
  3. Khách hàng gửi mã Moving Key này cho Admin (thông qua kênh liên lạc đã điền trong đơn hàng).
  4. Admin trên máy Nintendo 3DS mở ứng dụng **Pokémon Bank**, chọn **"Move Pokémon to Pokémon HOME"**, lựa chọn các Box Pokémon đã được nạp từ đơn hàng của khách.
  5. Pokémon Bank yêu cầu nhập mã Moving Key. Admin nhập mã 16 ký tự do khách hàng cung cấp.
  6. Sau khi nhập thành công, quá trình truyền tải dữ liệu giữa 3DS và máy chủ Pokémon HOME sẽ diễn ra tự động. Pokémon sẽ biến mất khỏi Pokémon Bank của Admin và xuất hiện trong Pokémon HOME của Khách hàng.

---

## IV. XỬ LÝ DỮ LIỆU ĐẦU VÀO & BỘ LỌC POKÉMON CHAMPIONS

Hệ thống sẽ nạp dữ liệu Pokémon từ tệp `Pokemon_Champions_Dex_Final.csv` vào Database theo các quy tắc lọc nghiêm ngặt sau:

1. **Bộ lọc Thế hệ (Gen 7 Limit)**:
   - Chỉ giữ lại các hàng có cột `NatDex` (National Dex ID) $\le 809$.
   - Bỏ qua các Pokémon từ Gen 8 trở lên (ví dụ: Corviknight #823, Flapple #841, Meowscarada #908,...).
2. **Bộ lọc Dạng vùng miền (Regional Form Filter)**:
   - Loại bỏ các dạng biến thể vùng miền được giới thiệu từ Gen 8 trở lên có tên chứa: `(Galar)`, `(Hisuian)`, `(Paldean)`.
   - Giữ lại các dạng biến thể vùng miền hợp lệ của Gen 7 như: `(Alolan)` (ví dụ: `Raichu (Alolan)` #26, `Ninetales (Alolan)` #38).
3. **Bộ lọc Mega Evolution**:
   - Các dòng chứa tên `Mega ...` (ví dụ: `Mega Venusaur` #3, `Mega Charizard X` #6) đại diện cho trạng thái tiến hóa Mega.
   - Trong save game và file `.pk7`, Pokémon Mega thực chất được lưu trữ dưới dạng cơ bản của nó (ví dụ: Venusaur, Charizard) và chỉ biến hình trong trận đấu khi mang theo đá Mega tương ứng (Held Item phù hợp).
   - **Giải pháp**:
     - Khi chạy công cụ lọc nạp cơ sở dữ liệu: Hệ thống sẽ tự động chuyển đổi các Pokémon dạng `Mega [Tên]` về dạng gốc tương ứng (hoặc đánh dấu liên kết đá Mega tự động). Để đơn giản cho cơ sở dữ liệu, danh sách Pokémon hiển thị trên Shop sẽ là các loài cơ bản hợp lệ (như Venusaur, Charizard, Blastoise).
     - Cho phép khách hàng chọn Held Item là các loại đá Mega tương ứng (ví dụ: Venusaurite, Charizardite X) để có thể tiến hóa Mega trong game.

---

## V. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA DESIGN)

Sử dụng PostgreSQL để lưu trữ danh sách Pokédex đã lọc, quản lý đơn hàng và lưu cấu hình giá sỉ/lẻ.

```sql
-- 1. Bảng lưu trữ Pokédex Champions (Chỉ chứa Gen 7 đổ lại sau khi lọc)
CREATE TABLE pokemon_dex (
    id INT PRIMARY KEY,                       -- National Dex ID (ví dụ: 3 cho Venusaur)
    name VARCHAR(100) NOT NULL,               -- Tên Pokémon
    type_one VARCHAR(50) NOT NULL,            -- Hệ 1 (ví dụ: Grass)
    type_two VARCHAR(50) DEFAULT 'N/A',       -- Hệ 2 (nếu có, ví dụ: Poison)
    is_active BOOLEAN DEFAULT TRUE            -- Trạng thái hiển thị trên shop
);

-- 2. Bảng quản lý đơn hàng của khách
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,      -- Tên khách hàng điền
    contact_info VARCHAR(150) NOT NULL,       -- Thông tin liên lạc (Zalo/Discord ID, SĐT,...)
    total_price DECIMAL(12, 2) NOT NULL,      -- Tổng số tiền đơn hàng (đã tính theo sỉ/lẻ)
    status order_status_enum DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng lưu trữ chi tiết Pokémon được nặn trong đơn hàng (Kèm file nhị phân .pk7)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    species_id INT NOT NULL,                  -- ID loài Pokémon
    species_name VARCHAR(100) NOT NULL,        -- Tên loài
    shiny BOOLEAN DEFAULT FALSE,              -- Có shiny hay không
    level INT NOT NULL,                       -- Level (1-100)
    ability VARCHAR(100) NOT NULL,            -- Đặc tính
    nature VARCHAR(100) NOT NULL,             -- Tính cách
    held_item VARCHAR(100) DEFAULT 'None',     -- Vật phẩm cầm theo
    moves TEXT[] NOT NULL,                    -- Mảng chứa tối đa 4 chiêu thức
    ivs JSONB NOT NULL,                       -- Chỉ số IVs (HP, Atk, Def, SpA, SpD, Spe) - từ 0-31
    evs JSONB NOT NULL,                       -- Chỉ số EVs (HP, Atk, Def, SpA, SpD, Spe) - từ 0-252 (tổng <= 510)
    trainer_name VARCHAR(50) NOT NULL,        -- Tên OT
    trainer_tid INT NOT NULL,                 -- Trainer ID (0-65535)
    trainer_sid INT NOT NULL,                 -- Secret ID (0-65535)
    pk7_data BYTEA NOT NULL,                  -- Dữ liệu nhị phân file .pk7 sinh từ PKHeX.Core để import
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng lưu cấu hình giá bán của hệ thống
CREATE TABLE pricing_config (
    key VARCHAR(50) PRIMARY KEY,              -- 'retail_price', 'wholesale_price', 'wholesale_threshold'
    value DECIMAL(12, 2) NOT NULL,            -- Giá tiền hoặc số lượng ngưỡng sỉ
    description TEXT
);

-- Khởi tạo giá trị mặc định cho cấu hình giá
INSERT INTO pricing_config (key, value, description) VALUES
('retail_price', 15000.00, 'Giá bán lẻ cho mỗi con Pokémon (VND)'),
('wholesale_price', 10000.00, 'Giá bán sỉ cho mỗi con Pokémon khi đạt số lượng ngưỡng (VND)'),
('wholesale_threshold', 5.00, 'Số lượng Pokémon tối thiểu trong đơn để được tính giá sỉ (con)');
```

---

## VI. CHI TIẾT LỚP API (API SPECIFICATION)

### 1. Lấy danh sách Pokédex Champions (Hiển thị ở trang chủ Shop)
- **Endpoint**: `GET /api/pokemon`
- **Response**:
  ```json
  [
    {
      "id": 3,
      "name": "Venusaur",
      "typeOne": "Grass",
      "typeTwo": "Poison"
    },
    ...
  ]
  ```

### 2. Kiểm tra hợp lệ Pokémon thời gian thực (Real-time Legality Check)
- **Endpoint**: `POST /api/pokemon/validate`
- **Request Body**:
  ```json
  {
    "speciesId": 3,
    "level": 100,
    "shiny": true,
    "ability": "Chlorophyll",
    "nature": "Modest",
    "heldItem": "Life Orb",
    "moves": ["Giga Drain", "Sludge Bomb", "Hidden Power", "Growth"],
    "ivs": { "hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 31 },
    "evs": { "hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252 },
    "trainerName": "Fallen",
    "trainerTid": 12345,
    "trainerSid": 54321
  }
  ```
- **Response (200 OK - Hợp lệ)**:
  ```json
  {
    "valid": true,
    "report": "Legality analysis passed."
  }
  ```
- **Response (400 Bad Request - Không hợp lệ)**:
  ```json
  {
    "valid": false,
    "report": "Move 3 (Hidden Power) is not learnable for Venusaur with Ability Chlorophyll in Gen 7.\nAbility Chlorophyll is a Hidden Ability, requires proper encounter origin."
  }
  ```

### 3. Gửi đơn hàng mua Pokémon (Submit Order)
- **Endpoint**: `POST /api/orders`
- **Request Body**:
  ```json
  {
    "customerName": "Nguyễn Văn A",
    "contactInfo": "Zalo: 0987654321",
    "pokemons": [
      {
        "speciesId": 3,
        "level": 100,
        "shiny": true,
        "ability": "Chlorophyll",
        "nature": "Modest",
        "heldItem": "Life Orb",
        "moves": ["Giga Drain", "Sludge Bomb", "Growth", "Synthesis"],
        "ivs": { "hp": 31, "atk": 31, "def": 31, "spa": 31, "spd": 31, "spe": 31 },
        "evs": { "hp": 4, "atk": 0, "def": 0, "spa": 252, "spd": 0, "spe": 252 },
        "trainerName": "Fallen",
        "trainerTid": 12345,
        "trainerSid": 54321
      }
      // Có thể gửi danh sách nhiều Pokémon
    ]
  }
  ```
- **Logic xử lý Backend**:
  1. Chạy vòng lặp kiểm tra tính hợp lệ bằng `PKHeX.Core` cho từng Pokémon trong danh sách. Nếu có bất kỳ con nào không hợp lệ, trả về lỗi ngay lập tức (Huỷ tạo đơn hàng và báo lỗi Pokémon nào bị hỏng).
  2. Tính tổng tiền:
     - Đọc cấu hình `retail_price`, `wholesale_price`, và `wholesale_threshold` từ bảng `pricing_config`.
     - Nếu số lượng Pokémon trong đơn $\ge$ `wholesale_threshold`, đơn giá mỗi con sẽ là `wholesale_price`. Ngược lại là `retail_price`.
     - `total_price = count * unit_price`.
  3. Tạo bản ghi đơn hàng trong bảng `orders` (Trạng thái mặc định: `PENDING`).
  4. Lần lượt sinh dữ liệu nhị phân `.pk7` bằng `PKHeX.Core` (chuyển đổi thông số cấu hình thành luồng byte nhị phân 232 byte đại diện cho Pokémon Gen 7) cho từng con và lưu vào bảng `order_items` dưới dạng `BYTEA`.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "orderId": 142,
    "totalPrice": 15000.00,
    "message": "Đơn hàng đã được tạo thành công. Vui lòng liên hệ Admin để chuyển giao Pokémon."
  }
  ```

### 4. Admin - Lấy danh sách đơn hàng (Admin Get Orders)
- **Endpoint**: `GET /api/admin/orders`
- **Response**:
  ```json
  [
    {
      "orderId": 142,
      "customerName": "Nguyễn Văn A",
      "contactInfo": "Zalo: 0987654321",
      "totalPrice": 15000.00,
      "status": "PENDING",
      "createdAt": "2026-06-07T08:00:00.000Z",
      "pokemonCount": 1
    }
  ]
  ```

### 5. Admin - Tải tập tin zip các file `.pk7` của đơn hàng (Admin Download Order Files)
- **Endpoint**: `GET /api/admin/orders/{id}/download`
- **Logic xử lý Backend**:
  - Truy vấn tất cả `order_items` thuộc `order_id` này.
  - Lấy trường dữ liệu nhị phân `pk7_data`.
  - Đóng gói toàn bộ các file nhị phân này thành một file nén dạng `.zip`. Tên mỗi file bên trong zip có dạng: `{index}_{PokemonName}_{Shiny_or_Not}.pk7` (ví dụ: `1_Venusaur_Shiny.pk7`).
  - Trả về file tải xuống trực tiếp dưới dạng `application/zip`.

### 6. Admin - Quản lý cấu hình giá (Admin Pricing Settings)
- **GET `/api/admin/pricing`**: Lấy cấu hình giá sỉ/lẻ hiện tại.
- **PUT `/api/admin/pricing`**: Cập nhật giá lẻ, giá sỉ hoặc ngưỡng sỉ.

---

## VII. ĐẶC TẢ GIAO DIỆN NGƯỜI DÙNG (FRONTEND DESIGN & UX)

### 1. Giao diện trang chủ Shop (Next.js):
- Sử dụng phong cách thiết kế hiện đại, gam màu huyền ảo (Glassmorphism, Dark mode, gradient màu tím-xanh neon sang trọng).
- Ô tìm kiếm và lọc danh sách Pokémon Champions theo Tên hoặc Hệ (Type).
- **Trình tạo Pokémon trực quan (Visual Editor)**:
  - Khi người dùng click chọn 1 Pokémon, mở bảng cấu hình chỉ số.
  - Hiển thị ảnh/sprite 2D chất lượng cao của Pokémon.
  - Dropdown chọn Đặc tính (Ability), Tính cách (Nature) được tải sẵn danh sách gợi ý.
  - Form chọn 4 chiêu thức (Moves) có tính năng tự động gợi ý/autocomplete.
  - Thanh trượt hoặc ô số để tùy chỉnh IVs (0-31) và EVs (0-252), tự động cộng tổng EVs để cảnh báo nếu vượt quá 510.
  - Checkbox chọn Shiny (nếu Shiny sẽ đổi ảnh Pokémon sang màu Shiny và thêm icon ngôi sao lấp lánh).
  - Khung điền thông tin người tạo (OT Name, TID, SID) để Pokémon thuộc quyền sở hữu của chính người chơi.
  - **Nút "Kiểm Tra Hợp Lệ"**: Gọi API `/validate` thời gian thực. Hiển thị màu xanh lá (Đạt) kèm nút "Thêm vào giỏ hàng", hoặc màu đỏ (Lỗi) kèm lý do lỗi chi tiết để người dùng sửa.

### 2. Giỏ hàng & Thanh toán:
- Liệt kê danh sách các Pokémon đã nặn hợp lệ trong giỏ.
- Hiển thị giá tạm tính cho từng con và tổng tiền.
- Tự động áp dụng giá bán sỉ nếu số lượng đạt ngưỡng quy định (ví dụ: mua 5 con trở lên thì giá mỗi con giảm từ 15,000đ xuống còn 10,000đ, hiển thị tem "Giá Sỉ" nổi bật).
- Form điền tên khách và phương thức liên hệ (Zalo, Discord, SĐT).
- Nút bấm gửi đơn hàng. Hiện mã QR thanh toán hoặc thông tin chuyển khoản kèm nội dung chuyển khoản tự động (ví dụ: "Thanh toan don hang #142").

### 3. Trang Admin Dashboard:
- Xem danh sách toàn bộ các đơn hàng phân loại theo bộ lọc trạng thái (`Chờ xử lý`, `Đã hoàn thành`, `Đã huỷ`).
- Xem chi tiết đơn hàng: tên khách, cách liên lạc, danh sách Pokémon được đặt kèm theo thông số chi tiết.
- Nút **"Tải Xuất File .PK7 (ZIP)"** để tải toàn bộ tệp tin nhị phân của các Pokémon về máy tính.
- Cột cập nhật trạng thái đơn hàng (Bấm "Hoàn thành" sau khi đã chuyển Pokémon cho khách qua Pokémon HOME).
- Panel cấu hình giá sỉ, giá lẻ và ngưỡng số lượng sỉ của Shop.

---

## VIII. QUY TRÌNH KIỂM THỬ & ĐÁNH GIÁ (VERIFICATION PLAN)

### 1. Kiểm thử Logic Lọc Danh Sách:
- Chạy mã script nạp SQL, kiểm tra bảng `pokemon_dex` xem đã loại bỏ sạch các Pokémon thế hệ 8+ (như Corviknight) và dạng vùng miền Galar/Hisui/Paldea hay chưa. Đảm bảo tổng số lượng loài cơ bản khớp với số lượng Pokémon Champions thế hệ 1-7.

### 2. Kiểm thử Legality & Sinh File `.pk7`:
- Sử dụng frontend nặn một Pokémon hợp lệ (ví dụ: Venusaur level 100, moves hợp lệ) và kiểm tra API `/validate` trả về `valid: true`.
- Nặn thử một Pokémon không hợp lệ (ví dụ: Venusaur học chiêu thức của Pokémon khác) để đảm bảo hệ thống chặn lại và trả về thông tin lỗi chính xác.
- Tạo một đơn hàng thành công, tải file ZIP từ trang Admin, giải nén và mở file `.pk7` thu được bằng phần mềm **PKHeX** trên máy tính để kiểm tra xem PKHeX có nhận diện đúng Pokémon đó không và có báo lỗi gì về tính hợp pháp hay không.

### 3. Kiểm thử Nghiệp vụ Chuyển Pokémon Lên HOME:
- Chuẩn bị một máy 3DS đã hack và cài đặt phần mềm PKSM.
- Copy file `.pk7` sinh ra từ đơn hàng vào thư mục `/3ds/PKSM/inject/` trên thẻ nhớ SD của 3DS.
- Dùng tính năng Inject của PKSM để nạp Pokémon vào game Pokémon Ultra Sun/Moon.
- Mở game trên 3DS kiểm tra sự xuất hiện của Pokémon trong Box.
- Mở Pokémon Bank trên 3DS, tiến hành chuyển giao Box đó sang Pokémon HOME bằng cách nhập Moving Key 16 ký tự được tạo từ điện thoại.
- Kiểm tra tài khoản Pokémon HOME trên điện thoại xem Pokémon đã xuất hiện an toàn và đầy đủ chỉ số chưa.