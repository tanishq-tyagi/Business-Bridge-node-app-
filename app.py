#import dependencies
import pandas as pd
import csv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
import os
import sys
import json

def textify(entity):
        if 'description' in entity:
            entity_text = str(entity['description'])  # Convert to string
        else:
            entity_text = ''
        for key, value in entity.items():
            if isinstance(value, bool) and value:
                entity_text += f' {str(key).replace("needs_", "").replace("_", " ")}'  # Convert to string
        return entity_text

def machinelearning(mentorcsv, entcsv, user ,person):
    mentors_df = pd.read_csv(mentorcsv, sep=",")
    entrepreneurs_df = pd.read_csv(entcsv, sep=",")
    entrepreneurs_df = entrepreneurs_df.tail(1)

    mentor_texts = [textify(mentors_df.loc[mentor].to_dict()) for mentor in mentors_df.index]
    entrepreneur_text = textify(entrepreneurs_df.iloc[0].to_dict())

    # Vectorize the text data using TF-IDF
    vectorizer = TfidfVectorizer()
    mentor_vectors = vectorizer.fit_transform(mentor_texts)
    entrepreneur_vector = vectorizer.transform([entrepreneur_text])

    if(person == 'entrepreneur'):
        # Train KNN model
        k = len(mentors_df)  # Number of neighbors to consider
        knn = NearestNeighbors(n_neighbors=k, metric='cosine')
        knn.fit(mentor_vectors)

        # Find nearest mentors for the entrepreneur with at least a 75% matching rate
        threshold = 0.75  # Minimum cosine similarity threshold
        distances, nearest_mentor_indices = knn.kneighbors(entrepreneur_vector)
        nearest_mentors = []
        for distance, idx in zip(distances[0], nearest_mentor_indices[0]):
            similarity = 1 - distance
            if similarity >= threshold:
                mentor_name = mentors_df.loc[mentors_df.index[idx], 'username']
                nearest_mentors.append((mentor_name, similarity))

        # Create DataFrame with mentor names as columns and entrepreneur name as index
        matched_mentors_data = {mentor: [similarity * 100] for mentor, similarity in nearest_mentors}
        matched_mentors_df = pd.DataFrame(matched_mentors_data, index=[user])

        # Check if output CSV file exists
        output_file = 'output.csv'
        headers = ['username'] + mentors_df['username'].tolist() if os.path.isfile(output_file) else ['username'] + ['Mentor_' + str(i) for i in range(1, len(mentors_df) + 1)]

        # Load existing data into DataFrame or create new DataFrame
        if os.path.isfile(output_file):
            output_df = pd.read_csv(output_file)
        else:
            output_df = pd.DataFrame(columns=headers)
        
        # Fill in the new row data
        new_row = [user] + [matched_mentors_df.get(mentor_name, [0])[0] for mentor_name in output_df.columns[1:]]
        
        # Append the new row to the DataFrame
        output_df.loc[len(output_df)] = new_row
        
        # Write DataFrame to CSV
        output_df.to_csv(output_file, index=False)
        print(output_df)

        print("Data appended to output.csv")
    else:
        # Load existing data from output CSV file
        output_file = 'output.csv'
        if os.path.isfile(output_file):
            output_df = pd.read_csv(output_file)
        else:
            # If the output file doesn't exist, create an empty DataFrame
            output_df = pd.DataFrame(columns=['username'])

        # Extract mentor name from the input data
        mentor_name = user  # Assuming the mentor's name is the same as the username in entrepreneurformdata.csv

        # Check if the mentor's name already exists as a header in the output CSV file
        if mentor_name in output_df.columns:
            print(f"Mentor {mentor_name} already exists in the output CSV file.")
        else:
            if mentor_name in mentors_df['username'].values:
                # Get mentor text data
                mentor_row = mentors_df.loc[mentors_df['username'] == mentor_name]
                mentor_text = textify(mentor_row.to_dict(orient='records')[0])  # Text data of the mentor
                mentor_vector = vectorizer.transform([mentor_text])  # Vectorize mentor text

                # Calculate similarity between the mentor and each entrepreneur in the output CSV file
                similarities = []
                for idx, row in output_df.iterrows():
                    entrepreneur_text = textify(df.iloc[0].to_dict())  # Text data of the entrepreneur
                    entrepreneur_vector = vectorizer.transform([entrepreneur_text])  # Vectorize entrepreneur text

                    similarity = (mentor_vector * entrepreneur_vector.T).A[0][0] * 100  # Calculate cosine similarity
                    similarities.append(similarity)

                # Add the mentor's similarity values as a new column in the output DataFrame
                output_df[mentor_name] = similarities

                # Write the updated DataFrame back to the output CSV file
                output_df.to_csv(output_file, index=False)

                print(f"Similarity values for Mentor {mentor_name} saved in output.csv")
            else:
                print(f"Mentor {mentor_name} not found in the mentors data.")

input_data_json = sys.argv[1]
input_data = json.loads(input_data_json)
person_value = input_data['myperson']
print(f"Received input data: person={person_value}")

if (person_value == 'entrepreneur'):
    df = pd.read_csv('entrepreneurformdata.csv',sep=',')
else:
    df = pd.read_csv('mentorformdata.csv',sep=',')

df = df.tail(1)
user = df['username'].values[0]
print(df['username'].values[0])

machinelearning('mentorformdata.csv', 'entrepreneurformdata.csv', user, person_value)