# combine all files in csv/ into one mega file
import os

import pandas as pd

all_files = [f for f in os.listdir("csv/") if f.endswith('.csv')]
print(f"Found {len(all_files)} CSV files.")
df_list = []
for file in all_files:
    file_path = os.path.join("csv/", file)
    print(f"Reading {file_path}...")
    df = pd.read_csv(file_path)
    df_list.append(df)
    mega_df = pd.concat(df_list, ignore_index=True)

output_path = "mega_data.csv"
mega_df.to_csv(output_path, index=False, encoding='utf-8')