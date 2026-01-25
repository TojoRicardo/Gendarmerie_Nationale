"""
Utilitaires Plotly pour générer les graphiques JSON.
"""

import plotly.graph_objects as go


def evolution_line_chart(data):
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=[item['mois'] for item in data],
            y=[item['total'] for item in data],
            mode='lines+markers',
            name='Cas totaux',
        )
    )
    fig.add_trace(
        go.Scatter(
            x=[item['mois'] for item in data],
            y=[item.get('prediction', item['total']) for item in data],
            mode='lines',
            dash='dash',
            name='Tendance prédite',
        )
    )
    fig.update_layout(
        template='plotly_white',
        height=400,
        margin=dict(l=20, r=20, t=40, b=40),
    )
    return fig.to_json()


def plot_monthly_evolution(data):
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=data.get('labels', []),
            y=data.get('values', []),
            mode='lines+markers',
            marker=dict(color='#0f52ba'),
            name='Cas mensuels',
        )
    )
    fig.update_layout(
        template='plotly_white',
        height=400,
        margin=dict(l=20, r=20, t=40, b=40),
        xaxis_title='Mois',
        yaxis_title='Nombre de cas',
    )
    return fig.to_json()


def plot_case_trend(data):
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=data.get('labels', []),
            y=data.get('values', []),
            marker_color='#2563eb',
            name='Nouveaux cas',
        )
    )
    fig.update_layout(
        template='plotly_white',
        height=400,
        margin=dict(l=20, r=20, t=40, b=40),
    )
    return fig.to_json()


def plot_province_distribution(data):
    fig = go.Figure(
        data=[
            go.Pie(
                labels=data.get('labels', []),
                values=data.get('values', []),
                hole=0.4,
            )
        ]
    )
    fig.update_layout(template='plotly_white', height=350)
    return fig.to_json()


def plot_realtime_activity(data):
    hourly = data.get('hourly', {'labels': [], 'values': []})
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=hourly.get('labels', []),
            y=hourly.get('values', []),
            mode='lines+markers',
            line=dict(color='#10b981'),
            name='Activité horaire',
        )
    )
    fig.update_layout(
        template='plotly_white',
        height=300,
        margin=dict(l=20, r=20, t=40, b=40),
        xaxis_title='Heures',
        yaxis_title='Cas',
    )
    return fig.to_json()


def bar_cases_chart(data):
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=[item['mois'] for item in data],
            y=[item['total'] for item in data],
            marker_color='#0f52ba',
            name='Cas',
        )
    )
    fig.update_layout(template='plotly_white', height=400)
    return fig.to_json()


def pie_province_chart(data):
    fig = go.Figure(
        data=[
            go.Pie(
                labels=[item['province'] for item in data],
                values=[item['total'] for item in data],
                hole=0.4,
            )
        ]
    )
    fig.update_layout(template='plotly_white', height=300)
    return fig.to_json()

