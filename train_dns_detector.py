"""
FlinkGuard - DNS Exfiltration & Infiltration ML Detection Pipeline
Trains Random Forest and Gradient Boosted Models on DNS Network Traffic Datasets (stateless & stateful).
Dataset source: data/new/{light, heavy}/[Attacks.zip, Benign.zip]
"""

import os
import zipfile
import argparse
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "new")

def extract_zip(zip_file: str, extract_to: str):
    """Extract zip file if not already extracted."""
    if not os.path.exists(zip_file):
        return
    zip_basename = os.path.splitext(os.path.basename(zip_file))[0]
    flag_file = os.path.join(extract_to, f".{zip_basename}_extracted")
    if not os.path.exists(flag_file):
        os.makedirs(extract_to, exist_ok=True)
        print(f"  [>] Extracting {os.path.basename(zip_file)}...")
        with zipfile.ZipFile(zip_file, 'r') as zf:
            zf.extractall(extract_to)
        with open(flag_file, 'w') as f:
            f.write("done")

def load_and_label_dataset(base_dir: str, feature_type: str = "stateless"):
    """
    Loads and labels DNS dataset archives.
    feature_type: 'stateless' (per-query features) or 'stateful' (aggregated flow features)
    """
    dfs = []
    for split_name in ["light", "heavy"]:
        folder_path = os.path.join(base_dir, split_name)
        if not os.path.isdir(folder_path):
            continue

        attacks_zip = os.path.join(folder_path, "Attacks.zip")
        benign_zip = os.path.join(folder_path, "Benign.zip")
        extract_path = os.path.join(folder_path, "extracted")

        extract_zip(attacks_zip, extract_path)
        extract_zip(benign_zip, extract_path)

        for root, _, files in os.walk(extract_path):
            for file in sorted(files):
                if not file.endswith('.csv'):
                    continue

                if feature_type in ["stateless", "stateful"]:
                    if feature_type not in file.lower():
                        continue

                file_path = os.path.join(root, file)
                try:
                    df = pd.read_csv(file_path, low_memory=False)
                    # Attacks = 1 (Malicious / Exfiltration), Benign = 0 (Normal)
                    is_attack = "attack" in file.lower() or "attack" in root.lower()
                    label = 1 if is_attack else 0
                    df['label'] = label
                    df['source_tier'] = split_name
                    dfs.append(df)
                    print(f"    Loaded: {split_name}/{file} ({df.shape[0]} rows, label={label})")
                except Exception as e:
                    print(f"    Warning: Failed to read {file_path}: {e}")

    if not dfs:
        raise ValueError(f"No CSV matching feature_type='{feature_type}' found in {base_dir}")

    master_df = pd.concat(dfs, ignore_index=True)
    return master_df

def preprocess_dataframe(df: pd.DataFrame):
    """
    Preprocesses DNS features:
    - Drops non-generalizable identifiers (timestamps, full domain names/strings)
    - Replaces domain strings ('sld', 'longest_word') with character length features to avoid data leakage
    - Replaces inf/nan with safe numeric representations
    """
    drop_cols = ['timestamp', 'source_tier', 'label']
    cols_to_drop = [c for c in drop_cols if c in df.columns]
    
    y = df['label'].values
    X = df.drop(columns=cols_to_drop)

    # In DNS logs, text fields like 'longest_word' or 'sld' sometimes contain words like "inf"
    # or specific domain names. Extract their length and drop the raw string to prevent leakage.
    text_features = ['longest_word', 'sld', 'distinct_ip', 'unique_country', 'unique_asn', 
                     'distinct_domains', 'reverse_dns', 'unique_ttl']
    for tf in text_features:
        if tf in X.columns:
            X[f"{tf}_len"] = X[tf].astype(str).str.len()
            X.drop(columns=[tf], inplace=True)

    # For any remaining object columns, attempt numeric conversion or length
    cat_cols = [c for c in X.columns if X[c].dtype == 'object']
    for c in cat_cols:
        converted = pd.to_numeric(X[c], errors='coerce')
        if converted.notnull().sum() > 0.6 * len(X):
            X[c] = converted
        else:
            X[f"{c}_len"] = X[c].astype(str).str.len()
            X.drop(columns=[c], inplace=True)

    # Replace inf and -inf with NaN, then impute with 0
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    X.fillna(0, inplace=True)

    # Ensure float32 range for tree models
    for col in X.select_dtypes(include=[np.number]).columns:
        X[col] = np.clip(X[col], -1e9, 1e9)

    return X, y

def main():
    parser = argparse.ArgumentParser(description="Train DNS Exfiltration Detector")
    parser.add_argument("--feature_type", type=str, default="stateless", choices=["stateless", "stateful"],
                        help="DNS feature category (stateless=per-query, stateful=aggregated flows)")
    parser.add_argument("--n_estimators", type=int, default=100, help="Number of trees in Random Forest")
    parser.add_argument("--max_samples", type=int, default=300000, 
                        help="Max rows to train on for fast training (use -1 for full dataset)")
    parser.add_argument("--save_model", type=str, default="models/dns_detector_rf.joblib", help="Output model path")
    args = parser.parse_args()

    print(f"\n=======================================================")
    print(f" DNS Exfiltration Detection - Random Forest Training   ")
    print(f" Base Directory: {BASE_DIR}")
    print(f" Feature Mode  : {args.feature_type}")
    print(f"=======================================================\n")

    print(f"[-] Loading and extracting DNS dataset ({args.feature_type})...")
    df_raw = load_and_label_dataset(BASE_DIR, feature_type=args.feature_type)
    print(f"[+] Loaded total records: {df_raw.shape[0]} rows, {df_raw.shape[1]} columns")
    print(f"    Class balance: Benign={sum(df_raw['label'] == 0)}, Attack={sum(df_raw['label'] == 1)}")

    # Downsample if max_samples is set
    if 0 < args.max_samples < len(df_raw):
        print(f"[-] Sampling {args.max_samples} records for training efficiency...")
        df_raw = df_raw.sample(n=args.max_samples, random_state=42).reset_index(drop=True)

    print("\n[-] Preprocessing features...")
    X, y = preprocess_dataframe(df_raw)
    print(f"[+] Processed Feature Matrix Shape: {X.shape}")
    print(f"    Feature list: {list(X.columns)}")

    print("\n[-] Splitting into train (70%) and test (30%) sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )

    print(f"[-] Training Random Forest Classifier ({args.n_estimators} trees, multi-core)...")
    clf = RandomForestClassifier(n_estimators=args.n_estimators, max_depth=16, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)

    print("[-] Evaluating model on held-out test data...")
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]

    print("\n" + "="*55)
    print("           DNS CLASSIFICATION REPORT")
    print("="*55)
    print(classification_report(y_test, y_pred, digits=4, target_names=["Benign (0)", "Exfiltration (1)"]))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
    
    cm = confusion_matrix(y_test, y_pred)
    print("\nConfusion Matrix:")
    print(f"  True Benign:      {cm[0, 0]} | False Malicious: {cm[0, 1]}")
    print(f"  Missed Attack:    {cm[1, 0]} | True Malicious:  {cm[1, 1]}")

    # Feature importances
    importances = pd.Series(clf.feature_importances_, index=X.columns).sort_values(ascending=False)
    print("\nTop 5 Most Informative DNS Features:")
    for feat, imp in importances.head(5).items():
        print(f"  • {feat:25s}: {imp:.4f}")

    # Save trained model
    os.makedirs(os.path.dirname(args.save_model), exist_ok=True)
    joblib.dump(clf, args.save_model)
    print(f"\n[+] Trained model saved to: {args.save_model}")

if __name__ == "__main__":
    main()
