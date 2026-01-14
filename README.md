# NexusInvest - AI-Driven Investment Portfolio Tracker

An advanced Streamlit application for tracking and analyzing investment portfolios with real-time market data, industry analysis, and intelligent bubble detection.

## Features

- **Plaid Integration**: Secure OAuth flow to connect investment accounts and retrieve real-time holdings
- **Financial Benchmarking**: Compare portfolio performance against S&P 500 (SPY)
- **Time-Weighted Return (TWR)**: Accurate performance calculation that accounts for cash flows
- **Total Return**: Absolute dollar gain/loss tracking
- **Industry Analysis**: Interactive GICS sector/industry breakdown with Plotly visualizations
- **Real-time News Feed**: Latest headlines for all portfolio companies
- **Bubble Watch**: Intelligent alerts for overheating sectors based on concentration and velocity metrics

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd nexusinvest
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
   - Copy `env.example` to `.env`
   - Fill in your API credentials:
     - `PLAID_CLIENT_ID`: Your Plaid client ID
     - `PLAID_SECRET`: Your Plaid secret key
     - `PLAID_ENV`: Environment (sandbox, development, or production)
     - `NEWSAPI_KEY`: Your NewsAPI.org API key

## Usage

Run the Streamlit application:
```bash
streamlit run app.py
```

The application will open in your default web browser.

## Demo Mode

If you don't have Plaid credentials set up, you can use the demo mode to explore the application with sample data. Click "Enter Demo Mode" in the sidebar.

## API Keys

### Plaid
1. Sign up at [Plaid](https://plaid.com)
2. Create a new application
3. Get your Client ID and Secret from the dashboard
4. Use "sandbox" environment for testing

### NewsAPI.org
1. Sign up at [NewsAPI.org](https://newsapi.org)
2. Get your free API key from the dashboard
3. Free tier allows 100 requests per day

## Features Explained

### Bubble Watch
The Bubble Watch feature monitors sectors for potential overheating by checking:
- **Concentration**: Industry makes up >30% of total portfolio value
- **Velocity**: Industry's 30-day growth rate is >1.5x the S&P 500 growth rate

When both conditions are met, a warning alert is displayed.

### Time-Weighted Return (TWR)
TWR calculates portfolio performance independent of cash flows, providing an accurate measure of investment skill rather than timing.

## Project Structure

```
nexusinvest/
├── app.py              # Main Streamlit application
├── requirements.txt    # Python dependencies
├── env.example         # Environment variables template
└── README.md          # This file
```

## Technologies Used

- **Streamlit**: Frontend framework
- **Pandas/NumPy**: Data manipulation
- **Plaid**: Financial account integration
- **yfinance**: Market data retrieval
- **NewsAPI**: News feed integration
- **Plotly**: Interactive visualizations

## License

This project is for educational and personal use.
