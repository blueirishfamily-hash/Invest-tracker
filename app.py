"""
NexusInvest - Advanced AI-Driven Investment Portfolio Tracker
A comprehensive Streamlit application for tracking and analyzing investment portfolios.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import yfinance as yf
from newsapi import NewsApiClient
try:
    import plaid
    from plaid.api import plaid_api
    from plaid.configuration import Configuration
    from plaid.model import (
        InvestmentsHoldingsGetRequest,
        CountryCode,
        Products,
    )
    from plaid.model.link_token_create_request import LinkTokenCreateRequest
    from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
    from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
    PLAID_AVAILABLE = True
except ImportError:
    PLAID_AVAILABLE = False
    plaid = None
import os
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Page configuration
st.set_page_config(
    page_title="NexusInvest",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for dark mode
st.markdown("""
    <style>
    .main {
        background-color: #0e1117;
        color: #fafafa;
    }
    .stApp {
        background-color: #0e1117;
    }
    .stSidebar {
        background-color: #1e1e1e;
    }
    h1, h2, h3 {
        color: #fafafa;
    }
    .metric-container {
        background-color: #1e1e1e;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
    </style>
    """, unsafe_allow_html=True)

# Initialize session state
if 'access_token' not in st.session_state:
    st.session_state.access_token = None
if 'holdings_data' not in st.session_state:
    st.session_state.holdings_data = None
if 'portfolio_df' not in st.session_state:
    st.session_state.portfolio_df = None


# ==================== PLaid Configuration ====================
def get_plaid_client():
    """Initialize and return Plaid API client."""
    if not PLAID_AVAILABLE:
        return None
    
    try:
        from plaid.configuration import Configuration
        from plaid.api_client import ApiClient
        from plaid import Environment as PlaidEnvironment
        
        plaid_env = os.getenv('PLAID_ENV', 'sandbox').upper()
        if plaid_env == 'SANDBOX':
            host = PlaidEnvironment.sandbox
        elif plaid_env == 'DEVELOPMENT':
            host = PlaidEnvironment.development
        elif plaid_env == 'PRODUCTION':
            host = PlaidEnvironment.production
        else:
            host = PlaidEnvironment.sandbox
        
        configuration = Configuration(
            host=host,
            api_key={
                'clientId': os.getenv('PLAID_CLIENT_ID'),
                'secret': os.getenv('PLAID_SECRET')
            }
        )
        api_client = ApiClient(configuration)
        return plaid_api.PlaidApi(api_client)
    except Exception as e:
        st.error(f"Error initializing Plaid client: {str(e)}")
        return None


# ==================== Helper Functions ====================
def get_ticker_info(ticker_symbol):
    """Fetch current market data for a ticker using yfinance."""
    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        hist = ticker.history(period="1mo")
        
        if hist.empty:
            return None
            
        current_price = hist['Close'].iloc[-1]
        prev_price = hist['Close'].iloc[0] if len(hist) > 0 else current_price
        growth_rate = ((current_price - prev_price) / prev_price) * 100 if prev_price > 0 else 0
        
        return {
            'current_price': current_price,
            'growth_rate_30d': growth_rate,
            'sector': info.get('sector', 'Unknown'),
            'industry': info.get('industry', 'Unknown'),
            'gics_sector': info.get('gicsSector', info.get('sector', 'Unknown')),
            'gics_industry': info.get('gicsSubIndustry', info.get('industry', 'Unknown'))
        }
    except Exception as e:
        st.error(f"Error fetching data for {ticker_symbol}: {str(e)}")
        return None


def get_spy_data():
    """Fetch S&P 500 (SPY) data for benchmarking."""
    try:
        spy = yf.Ticker("SPY")
        hist = spy.history(period="1mo")
        
        if hist.empty:
            return None
            
        current_price = hist['Close'].iloc[-1]
        prev_price = hist['Close'].iloc[0] if len(hist) > 0 else current_price
        growth_rate = ((current_price - prev_price) / prev_price) * 100 if prev_price > 0 else 0
        
        return {
            'current_price': current_price,
            'growth_rate_30d': growth_rate,
            'history': hist
        }
    except Exception as e:
        st.error(f"Error fetching SPY data: {str(e)}")
        return None


def calculate_twr(portfolio_df, initial_value, current_value):
    """
    Calculate Time-Weighted Return (TWR).
    Simplified version - in production, you'd track cash flows more precisely.
    """
    if initial_value == 0:
        return 0.0
    
    # TWR = (Ending Value / Beginning Value) - 1
    twr = ((current_value / initial_value) - 1) * 100
    return twr


def calculate_total_return(portfolio_df):
    """Calculate absolute dollar gain/loss."""
    if portfolio_df is None or portfolio_df.empty:
        return 0.0
    
    total_cost_basis = portfolio_df['cost_basis'].sum()
    total_current_value = portfolio_df['current_value'].sum()
    
    return total_current_value - total_cost_basis


def fetch_news(ticker_symbol, api_key):
    """Fetch the 3 most recent news articles for a ticker."""
    try:
        newsapi = NewsApiClient(api_key=api_key)
        
        # Get company name from ticker info
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        company_name = info.get('longName', ticker_symbol)
        
        # Search for news
        articles = newsapi.get_everything(
            q=company_name,
            language='en',
            sort_by='publishedAt',
            page_size=3
        )
        
        return articles.get('articles', [])
    except Exception as e:
        st.warning(f"Could not fetch news for {ticker_symbol}: {str(e)}")
        return []


def get_gics_mapping():
    """Map tickers to GICS sectors and industries."""
    # This is a simplified mapping - in production, you'd use a comprehensive GICS database
    # For now, we'll rely on yfinance data which includes GICS information
    return {}


# ==================== Plaid Holdings Retrieval ====================
def fetch_plaid_holdings(access_token):
    """Fetch investment holdings from Plaid."""
    if not PLAID_AVAILABLE:
        return None
    
    try:
        client = get_plaid_client()
        if client is None:
            return None
        
        request = InvestmentsHoldingsGetRequest(access_token=access_token)
        response = client.investments_holdings_get(request)
        
        holdings = []
        # Create a dictionary mapping security_id to security object
        securities_dict = {}
        if hasattr(response, 'securities') and response.securities:
            for sec in response.securities:
                securities_dict[sec.security_id] = sec
        
        # Process holdings
        if hasattr(response, 'holdings') and response.holdings:
            for holding in response.holdings:
                security_id = holding.security_id
                if security_id in securities_dict:
                    security = securities_dict[security_id]
                    ticker = security.ticker_symbol if hasattr(security, 'ticker_symbol') and security.ticker_symbol else 'N/A'
                    name = security.name if hasattr(security, 'name') else 'Unknown'
                    quantity = float(holding.quantity) if hasattr(holding, 'quantity') else 0
                    
                    # Handle cost_basis (can be dict or number)
                    cost_basis = 0
                    if hasattr(holding, 'cost_basis'):
                        if isinstance(holding.cost_basis, dict):
                            cost_basis = float(holding.cost_basis.get('value', 0))
                        else:
                            cost_basis = float(holding.cost_basis) if holding.cost_basis else 0
                    
                    institution_price = float(holding.institution_price) if hasattr(holding, 'institution_price') and holding.institution_price else 0
                    institution_value = float(holding.institution_value) if hasattr(holding, 'institution_value') and holding.institution_value else 0
                    
                    holdings.append({
                        'ticker': ticker,
                        'name': name,
                        'quantity': quantity,
                        'cost_basis': cost_basis,
                        'institution_price': institution_price,
                        'institution_value': institution_value
                    })
        
        return holdings
    except Exception as e:
        st.error(f"Error fetching Plaid holdings: {str(e)}")
        return None


# ==================== Bubble Watch Logic ====================
def check_bubble_watch(portfolio_df, spy_growth_rate):
    """Check for overheating sectors based on concentration and velocity."""
    if portfolio_df is None or portfolio_df.empty:
        return []
    
    warnings = []
    
    # Group by industry
    industry_analysis = portfolio_df.groupby('industry').agg({
        'current_value': 'sum',
        'growth_rate_30d': 'mean'
    }).reset_index()
    
    total_portfolio_value = portfolio_df['current_value'].sum()
    
    for _, row in industry_analysis.iterrows():
        industry = row['industry']
        industry_value = row['current_value']
        industry_growth = row['growth_rate_30d']
        
        # Check concentration (>30% of portfolio)
        concentration = (industry_value / total_portfolio_value) * 100 if total_portfolio_value > 0 else 0
        
        # Check velocity (>1.5x SPY growth rate)
        velocity_threshold = spy_growth_rate * 1.5 if spy_growth_rate is not None else 0
        
        if concentration > 30 and industry_growth > velocity_threshold:
            warnings.append({
                'industry': industry,
                'concentration': concentration,
                'growth_rate': industry_growth,
                'spy_growth_rate': spy_growth_rate
            })
    
    return warnings


# ==================== Main Application ====================
def main():
    st.title("📈 NexusInvest - AI-Driven Portfolio Tracker")
    st.markdown("---")
    
    # Sidebar for Plaid connection
    with st.sidebar:
        st.header("🔐 Account Connection")
        
        if st.session_state.access_token is None:
            st.info("Connect your investment account using Plaid to get started.")
            
            # Note: Full Plaid OAuth flow implementation would require:
            # 1. Creating a link_token via /link/token/create
            # 2. Opening Plaid Link in an iframe or popup
            # 3. Exchanging public_token for access_token via /item/public_token/exchange
            # 4. Storing access_token securely (e.g., in session state or database)
            # For production, implement the full flow as per Plaid documentation
            
            if PLAID_AVAILABLE and os.getenv('PLAID_CLIENT_ID') and os.getenv('PLAID_SECRET'):
                st.subheader("Plaid Connection")
                st.info("Plaid credentials detected. Implement OAuth flow to connect accounts.")
                # TODO: Implement full Plaid Link OAuth flow here
            
            # For demo purposes, we'll use a manual input option
            st.subheader("Manual Entry (Demo Mode)")
            if st.button("Enter Demo Mode"):
                st.session_state.demo_mode = True
                st.success("Demo mode activated. Using sample data.")
        
        if st.session_state.access_token or st.session_state.get('demo_mode', False):
            st.success("✅ Account Connected")
            if st.button("Disconnect"):
                st.session_state.access_token = None
                st.session_state.holdings_data = None
                st.session_state.portfolio_df = None
                st.session_state.demo_mode = False
                st.rerun()
    
    # Main dashboard
    if st.session_state.access_token is None and not st.session_state.get('demo_mode', False):
        st.info("👈 Please connect your account in the sidebar to view your portfolio.")
        
        # Show sample data structure
        st.subheader("Sample Portfolio Data Structure")
        sample_data = {
            'ticker': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
            'quantity': [10, 5, 8, 12, 15],
            'cost_basis': [15000, 12000, 8000, 15000, 12000]
        }
        st.dataframe(pd.DataFrame(sample_data))
    else:
        # Load portfolio data
        if st.session_state.portfolio_df is None:
            with st.spinner("Loading portfolio data..."):
                if st.session_state.get('demo_mode', False):
                    # Demo data
                    demo_holdings = [
                        {'ticker': 'AAPL', 'quantity': 10, 'cost_basis': 15000},
                        {'ticker': 'MSFT', 'quantity': 5, 'cost_basis': 12000},
                        {'ticker': 'GOOGL', 'quantity': 8, 'cost_basis': 8000},
                        {'ticker': 'AMZN', 'quantity': 12, 'cost_basis': 15000},
                        {'ticker': 'TSLA', 'quantity': 15, 'cost_basis': 12000},
                        {'ticker': 'NVDA', 'quantity': 20, 'cost_basis': 20000},
                    ]
                    holdings_data = demo_holdings
                else:
                    holdings_data = fetch_plaid_holdings(st.session_state.access_token)
                
                if holdings_data:
                    # Process holdings
                    portfolio_list = []
                    for holding in holdings_data:
                        ticker = holding['ticker']
                        if ticker and ticker != 'N/A':
                            ticker_info = get_ticker_info(ticker)
                            if ticker_info:
                                quantity = holding.get('quantity', 0)
                                cost_basis = holding.get('cost_basis', 0)
                                current_price = ticker_info['current_price']
                                current_value = quantity * current_price
                                
                                portfolio_list.append({
                                    'ticker': ticker,
                                    'quantity': quantity,
                                    'cost_basis': cost_basis,
                                    'current_price': current_price,
                                    'current_value': current_value,
                                    'growth_rate_30d': ticker_info['growth_rate_30d'],
                                    'sector': ticker_info['sector'],
                                    'industry': ticker_info['industry'],
                                    'gics_sector': ticker_info['gics_sector'],
                                    'gics_industry': ticker_info['gics_industry']
                                })
                    
                    if portfolio_list:
                        st.session_state.portfolio_df = pd.DataFrame(portfolio_list)
                    else:
                        st.error("No valid holdings found.")
        
        # Display portfolio dashboard
        if st.session_state.portfolio_df is not None and not st.session_state.portfolio_df.empty:
            portfolio_df = st.session_state.portfolio_df
            
            # Fetch SPY data for benchmarking
            spy_data = get_spy_data()
            spy_growth_rate = spy_data['growth_rate_30d'] if spy_data else 0
            
            # Calculate metrics
            total_cost_basis = portfolio_df['cost_basis'].sum()
            total_current_value = portfolio_df['current_value'].sum()
            total_return = calculate_total_return(portfolio_df)
            twr = calculate_twr(portfolio_df, total_cost_basis, total_current_value)
            
            # Key Metrics Row
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Portfolio Value", f"${total_current_value:,.2f}")
            with col2:
                st.metric("Total Cost Basis", f"${total_cost_basis:,.2f}")
            with col3:
                st.metric("Total Return", f"${total_return:,.2f}", 
                         delta=f"{(total_return/total_cost_basis*100):.2f}%" if total_cost_basis > 0 else "0%")
            with col4:
                st.metric("Time-Weighted Return", f"{twr:.2f}%")
            
            st.markdown("---")
            
            # Bubble Watch Alerts
            bubble_warnings = check_bubble_watch(portfolio_df, spy_growth_rate)
            if bubble_warnings:
                st.warning("⚠️ **Bubble Watch Alert**")
                for warning in bubble_warnings:
                    st.warning(
                        f"**{warning['industry']}** sector is showing signs of overheating:\n"
                        f"- Portfolio Concentration: {warning['concentration']:.2f}%\n"
                        f"- 30-Day Growth Rate: {warning['growth_rate']:.2f}%\n"
                        f"- S&P 500 Growth Rate: {warning['spy_growth_rate']:.2f}%"
                    )
            
            # Tabs for different views
            tab1, tab2, tab3, tab4 = st.tabs(["📊 Portfolio Overview", "📈 Benchmarking", "🏭 Industry Analysis", "📰 News Feed"])
            
            with tab1:
                st.subheader("Portfolio Holdings")
                display_df = portfolio_df[['ticker', 'quantity', 'current_price', 'cost_basis', 'current_value', 'growth_rate_30d']].copy()
                display_df.columns = ['Ticker', 'Quantity', 'Current Price', 'Cost Basis', 'Current Value', '30D Growth %']
                display_df['Current Price'] = display_df['Current Price'].apply(lambda x: f"${x:.2f}")
                display_df['Cost Basis'] = display_df['Cost Basis'].apply(lambda x: f"${x:.2f}")
                display_df['Current Value'] = display_df['Current Value'].apply(lambda x: f"${x:.2f}")
                display_df['30D Growth %'] = display_df['30D Growth %'].apply(lambda x: f"{x:.2f}%")
                st.dataframe(display_df, use_container_width=True)
            
            with tab2:
                st.subheader("Portfolio vs S&P 500 Benchmark")
                if spy_data:
                    portfolio_growth = portfolio_df['growth_rate_30d'].mean()
                    
                    comparison_data = {
                        'Metric': ['30-Day Growth Rate'],
                        'Your Portfolio': [portfolio_growth],
                        'S&P 500 (SPY)': [spy_growth_rate]
                    }
                    comp_df = pd.DataFrame(comparison_data)
                    st.dataframe(comp_df, use_container_width=True)
                    
                    # Visualization
                    fig = go.Figure()
                    fig.add_trace(go.Bar(
                        x=['Your Portfolio', 'S&P 500 (SPY)'],
                        y=[portfolio_growth, spy_growth_rate],
                        marker_color=['#1f77b4', '#ff7f0e']
                    ))
                    fig.update_layout(
                        title="30-Day Growth Rate Comparison",
                        xaxis_title="",
                        yaxis_title="Growth Rate (%)",
                        template="plotly_dark",
                        height=400
                    )
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.error("Unable to fetch S&P 500 data for benchmarking.")
            
            with tab3:
                st.subheader("Industry Breakdown")
                
                # Industry analysis
                industry_df = portfolio_df.groupby('industry').agg({
                    'current_value': 'sum',
                    'ticker': 'count'
                }).reset_index()
                industry_df.columns = ['Industry', 'Total Value', 'Number of Holdings']
                industry_df['Percentage'] = (industry_df['Total Value'] / industry_df['Total Value'].sum() * 100).round(2)
                industry_df = industry_df.sort_values('Total Value', ascending=False)
                
                st.dataframe(industry_df, use_container_width=True)
                
                # Pie chart
                fig = px.pie(
                    industry_df,
                    values='Total Value',
                    names='Industry',
                    title="Portfolio Industry Distribution",
                    color_discrete_sequence=px.colors.sequential.Viridis
                )
                fig.update_layout(template="plotly_dark", height=500)
                st.plotly_chart(fig, use_container_width=True)
            
            with tab4:
                st.subheader("Real-time News Feed")
                newsapi_key = os.getenv('NEWSAPI_KEY')
                
                if newsapi_key:
                    for ticker in portfolio_df['ticker'].unique():
                        with st.expander(f"📰 {ticker} News"):
                            articles = fetch_news(ticker, newsapi_key)
                            if articles:
                                for article in articles[:3]:  # Top 3 articles
                                    st.markdown(f"### {article.get('title', 'No title')}")
                                    st.markdown(f"**Source:** {article.get('source', {}).get('name', 'Unknown')} | **Published:** {article.get('publishedAt', 'Unknown')}")
                                    st.markdown(f"{article.get('description', 'No description available')}")
                                    if article.get('url'):
                                        st.markdown(f"[Read more]({article['url']})")
                                    st.markdown("---")
                            else:
                                st.info(f"No recent news found for {ticker}")
                else:
                    st.warning("NewsAPI key not configured. Please add NEWSAPI_KEY to your .env file.")
        
        else:
            st.error("No portfolio data available. Please check your connection.")


if __name__ == "__main__":
    main()
