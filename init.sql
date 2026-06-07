-- Bảng lưu trữ Pokédex Champions (Chỉ chứa các loài Gen 7 trở xuống sau khi lọc)
CREATE TABLE pokemon_dex (
    id SERIAL PRIMARY KEY,                    -- ID tự tăng
    nat_dex INT NOT NULL,                     -- National Dex ID (ví dụ: 3 cho Venusaur, 26 cho Raichu)
    name VARCHAR(100) NOT NULL,               -- Tên Pokémon (ví dụ: "Raichu (Alolan)")
    type_one VARCHAR(50) NOT NULL,            -- Hệ thứ nhất (ví dụ: Electric)
    type_two VARCHAR(50) DEFAULT 'N/A',       -- Hệ thứ hai (nếu có, ví dụ: Psychic)
    abilities TEXT[] NOT NULL,                -- Mảng chứa các đặc tính hợp lệ ở Gen 7
    moves TEXT[] NOT NULL,                    -- Mảng chứa các chiêu thức hợp lệ ở Gen 7
    is_active BOOLEAN DEFAULT TRUE,           -- Cho phép hiển thị trên shop hay không
    sprite_url TEXT                           -- URL ảnh sprite của Pokémon
);

-- Bảng quản lý người dùng
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Khai báo kiểu dữ liệu Enum quản lý trạng thái đơn hàng
CREATE TYPE order_status_enum AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- Bảng quản lý thông tin đơn hàng
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,      -- ID người dùng đặt hàng
    customer_name VARCHAR(100) NOT NULL,      -- Tên khách hàng
    contact_info VARCHAR(150) NOT NULL,       -- Phương thức liên lạc (Zalo, Discord, SĐT,...)
    total_price DECIMAL(12, 2) NOT NULL,      -- Tổng giá trị đơn hàng (VND)
    status order_status_enum DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng giỏ hàng lưu cấu hình Pokémon của User
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index cho user_id của cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Bảng lưu trữ cấu hình Pokémon tùy chỉnh trong đơn hàng (Kèm byte data .pk7)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    species_id INT NOT NULL,                  -- ID loài Pokémon
    species_name VARCHAR(100) NOT NULL,        -- Tên Pokémon
    shiny BOOLEAN DEFAULT FALSE,              -- Có lấp lánh (Shiny) không
    level INT NOT NULL,                       -- Level của Pokémon (1-100)
    ability VARCHAR(100) NOT NULL,            -- Đặc tính (Ability)
    nature VARCHAR(100) NOT NULL,             -- Tính cách (Nature)
    held_item VARCHAR(100) DEFAULT 'None',     -- Vật phẩm mang theo
    moves TEXT[] NOT NULL,                    -- Mảng tối đa 4 chiêu thức
    ivs JSONB NOT NULL,                       -- Chỉ số IVs (HP, Atk, Def, SpA, SpD, Spe) - từ 0-31
    evs JSONB NOT NULL,                       -- Chỉ số EVs (HP, Atk, Def, SpA, SpD, Spe) - từ 0-252 (tổng <= 510)
    trainer_name VARCHAR(50) NOT NULL,        -- Tên người chơi gốc (OT Name)
    trainer_tid INT NOT NULL,                 -- Trainer ID (0-65535)
    trainer_sid INT NOT NULL,                 -- Secret ID (0-65535)
    pk7_data BYTEA NOT NULL,                  -- Dữ liệu nhị phân file .pk7 sinh từ PKHeX.Core để import thủ công
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lưu cấu hình giá bán sỉ / lẻ của Shop
CREATE TABLE pricing_config (
    key VARCHAR(50) PRIMARY KEY,              -- 'retail_price', 'wholesale_price', 'wholesale_threshold'
    value DECIMAL(12, 2) NOT NULL,            -- Giá tiền hoặc số lượng ngưỡng
    description TEXT
);

-- Nạp cấu hình giá mặc định ban đầu
INSERT INTO pricing_config (key, value, description) VALUES
('retail_price', 15000.00, 'Giá bán lẻ cho mỗi con Pokémon (VND)'),
('wholesale_price', 10000.00, 'Giá bán sỉ cho mỗi con Pokémon khi đơn hàng đạt số lượng sỉ (VND)'),
('wholesale_threshold', 5.00, 'Số lượng Pokémon tối thiểu trong đơn để được tính giá sỉ (con)');
