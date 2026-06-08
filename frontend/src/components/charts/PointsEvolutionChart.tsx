/*
 * Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
 * Author: Luis Vilela Acuña
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface PointsEvolutionChartProps {
    data: {
        name: string;
        deportivos: number;
        educativos: number;
    }[];
}

export function PointsEvolutionChart({ data }: PointsEvolutionChartProps) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,170,199,0.16)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="rgba(150,170,199,0.55)"
                        tick={{ fill: '#d8e6ff', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="rgba(150,170,199,0.55)"
                        tick={{ fill: '#d8e6ff', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(11,24,44,0.94)',
                            border: '1px solid rgba(90,126,181,0.38)',
                            borderRadius: '14px',
                            color: '#f5fbff',
                        }}
                        labelStyle={{ color: '#f5fbff', fontWeight: 600 }}
                        itemStyle={{ color: '#d8e6ff' }}
                    />
                    <Legend wrapperStyle={{ color: '#d8e6ff', paddingTop: '8px' }} />
                    <Bar dataKey="deportivos" stackId="a" fill="#3c7dff" radius={[8, 8, 0, 0]} name="Puntos deportivos" />
                    <Bar dataKey="educativos" stackId="a" fill="#21d1b1" radius={[8, 8, 0, 0]} name="Puntos educativos" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
