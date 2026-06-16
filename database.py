import psycopg2
import psycopg2.extras
import os
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def create_tables():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                glucose FLOAT NOT NULL,
                bmi FLOAT NOT NULL,
                age INT NOT NULL,
                insulin FLOAT NOT NULL,
                bp FLOAT NOT NULL,
                skin FLOAT NOT NULL,
                dpf FLOAT NOT NULL,
                pregnancies INT NOT NULL,
                result VARCHAR(20) NOT NULL,
                probability FLOAT NOT NULL,
                risk_level VARCHAR(20) NOT NULL,
                model_used VARCHAR(50) NOT NULL,
                rf_probability FLOAT,
                lr_probability FLOAT,
                svm_probability FLOAT,
                top_feature VARCHAR(100),
                explanation TEXT,
                patient_id VARCHAR(50),
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS model_metrics (
                id SERIAL PRIMARY KEY,
                model_name VARCHAR(50) NOT NULL,
                accuracy FLOAT,
                f1_score FLOAT,
                roc_auc FLOAT,
                precision_score FLOAT,
                recall_score FLOAT,
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_predictions_result ON predictions(result);
            CREATE INDEX IF NOT EXISTS idx_predictions_risk_level ON predictions(risk_level);
        """)
        conn.commit()
        print("✅ Database tables created successfully")
