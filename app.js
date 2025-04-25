//dependencies
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csvParser = require('csv-parser');
const { spawn } = require('child_process');
const session = require('express-session');
const path = require('path');

//needed global variables or abbreviations
const app = express();
const port = 4011;
var person='';

//set view engine and bodyparser for app
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

//app.get i.e set routes to render ejs pages
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/register', (req, res) => {
    res.render('register',{person:person});
});

app.get('/filloutform', (req, res) => {
    if(person == 'mentor'){
        res.render('mentorform');
    }
    else{
        res.render('entrepreneurform');
    }
});

app.get('/login', (req, res) => {
    res.render('login',{person:person});
});

app.get('/sucessfullyregistered', (req, res) => {
    res.render('sucessfullyregistered');
});

function renderSuccessfulLogin(res, sortedValues) {
    res.render('loginsuccessfulentrepreneur', { sortedValues });
}

app.get('/loginsuccessfulmentor', (req, res) => {
    res.render('loginsuccessfulmentor');
})

//app.post
app.post('/', (req, res) => {
    var proceed='';
    const {typeofperson,howtoproceed} = req.body;
    person = typeofperson;
    proceed = howtoproceed;
    if(proceed == 'register'){
        res.redirect('/register');
    }
    else{
        res.redirect('/login');
    }
});

app.post('/login', (req, res) => {
    var loginSuccessful = false;
    const { username, password } = req.body;

    // Check if the username and password are valid
    fs.createReadStream('userdetails.csv')
        .pipe(csvParser())
        .on('data', (row) => {
            if(row.username === username && row.password === password && row.person === person) {
                loginSuccessful = true;
            }
        })
        .on('end', () => {
            if (loginSuccessful) {
                if(person=='mentor'){
                    res.redirect('/loginsuccessfulmentor');
                }
                else{
                    // Read output.csv and find the row corresponding to the username
                    const rows = [];
                    fs.createReadStream('output.csv')
                        .pipe(csvParser())
                        .on('data', (row) => {
                            rows.push(row);
                        })
                        .on('end', () => {
                            const userRow = rows.find(row => row.username === username);
                            if (userRow) {
                                // Sort the non-zero values in the row in descending order
                                const sortedValues = Object.entries(userRow)
                                    .filter(([key, value]) => key !== 'username' && value !== '0')
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 5);

                                // Call a function to render the successful login page
                                renderSuccessfulLogin(res, sortedValues);
                            } else {
                                res.status(400).send('Error: No data found for this user.');
                            }
                        });
                }
            } else {
                res.status(400).send('Invalid username or password.');
            }
        });
});

app.post('/register', (req, res) => {
    const { firstname, lastname, username, password, confirmpassword, email } = req.body;
    req.session.username = username;

    var usernameExists = false;
    var emailAlreadyRegistered = false;

    fs.createReadStream('userdetails.csv')
        .pipe(csvParser())
        .on('data', (row) => {
            if(row.username == username) {
                usernameExists = true;
            }
            if(row.email == email){
                emailAlreadyRegistered = true;
            }
            if(confirmpassword!=password){
                res.status(400).send('Password does not match.')
            }
        })
        .on('end', () => {
            if (usernameExists){
                res.status(400).send('Username already exists.');
            } 
            else if(emailAlreadyRegistered){
                res.status(400).send('This email is already registered with us.');
            }
            else {
                const newUser = `${firstname},${lastname},${username},${password},${email},${person}\n`;
                fs.appendFile('userdetails.csv', newUser, (err) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send('Internal server error.');
                    } else {
                        res.redirect('/filloutform');
                    }
                });
            }
        });
});

app.post('/sucessfullyregistered', (req, res) => {
    res.redirect('/login');
});

app.post('/filloutform', (req, res) => {
    if(person == 'entrepreneur'){
        const username = req.session.username;
        const {
            company_organization,
            industry,
            description
        } = req.body;

        // Set default values for checkboxes
        const defaultValues = {
            business_strategy: 'FALSE',
            marketing_sales: 'FALSE',
            product_development: 'FALSE',
            operations_logistics: 'FALSE',
            financial_management: 'FALSE',
            human_resources: 'FALSE',
            legal_regulatory_compliance: 'FALSE',
            technology_it: 'FALSE',
            scaling_growth: 'FALSE',
            sustainability_social_impact: 'FALSE',
        };

        // Update checkbox values if they are checked
        for (const key in defaultValues) {
            if (req.body[key]) {
                defaultValues[key] = 'TRUE';
            }
        }

        const entrepreneurFormData = `${username},${company_organization},${industry},${defaultValues.business_strategy},${defaultValues.marketing_sales},${defaultValues.product_development},${defaultValues.operations_logistics},${defaultValues.financial_management},${defaultValues.human_resources},${defaultValues.legal_regulatory_compliance},${defaultValues.technology_it},${defaultValues.scaling_growth},${defaultValues.sustainability_social_impact},${description}\n`;

        fs.appendFileSync('entrepreneurformdata.csv', entrepreneurFormData, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal server error.');
            }
        });

        res.redirect('/sucessfullyregistered');
    }
    else{
        const username = req.session.username;
        const {
            industry,
            industry_experience_years,
            awards
        } = req.body;

        // Set default values for checkboxes
        const defaultValues = {
            business_strategy: 'FALSE',
            marketing_sales: 'FALSE',
            product_development: 'FALSE',
            operations_logistics: 'FALSE',
            financial_management: 'FALSE',
            human_resources: 'FALSE',
            legal_regulatory_compliance: 'FALSE',
            technology_it: 'FALSE',
            scaling_growth: 'FALSE',
            sustainability_social_impact: 'FALSE',
        };

        // Update checkbox values if they are checked
        for (const key in defaultValues) {
            if (req.body[key]) {
                defaultValues[key] = 'TRUE';
            }
        }

        const mentorFormData = `${username},${industry},${industry_experience_years},${defaultValues.business_strategy},${defaultValues.marketing_sales},${defaultValues.product_development},${defaultValues.operations_logistics},${defaultValues.financial_management},${defaultValues.human_resources},${defaultValues.legal_regulatory_compliance},${defaultValues.technology_it},${defaultValues.scaling_growth},${defaultValues.sustainability_social_impact},${awards}\n`;

        fs.appendFileSync('mentorformdata.csv', mentorFormData, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal server error.');
            }
        });
        res.redirect('/sucessfullyregistered');
    }
    
    const inputData = {
        myperson: person,
    };

    // Spawn a child process to run the Python script
    const pythonProcess = spawn('python', ['app.py', JSON.stringify(inputData)]);

    // Listen for data from the Python script's stdout
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Data from Python script: ${data}`);
    });

    // Listen for errors from the Python script
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error from Python script: ${data}`);
    });

    // Listen for the Python script's exit event
    pythonProcess.on('close', (code) => {
        console.log(`Python script exited with code ${code}`);
    });
});

app.listen(port, () => {
    console.log(`app.js listening on port ${port}`);
});
