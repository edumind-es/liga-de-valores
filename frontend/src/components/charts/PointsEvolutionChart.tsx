/*
 * Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
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
                        tick={{ fill: '#b8b1a3', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="rgba(150,170,199,0.55)"
                        tick={{ fill: '#b8b1a3', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(30,27,22,0.94)',
                            border: '1px solid rgba(125,118,106,0.4)',
                            borderRadius: '3px',
                            color: '#ece8dd',
                        }}
                        labelStyle={{ color: '#ece8dd', fontWeight: 600 }}
                        itemStyle={{ color: '#b8b1a3' }}
                    />
                    <Legend wrapperStyle={{ color: '#b8b1a3', paddingTop: '8px' }} />
                    <Bar dataKey="deportivos" stackId="a" fill="#3f7d99" radius={[2, 2, 0, 0]} name="Puntos deportivos" />
                    <Bar dataKey="educativos" stackId="a" fill="#6ea94a" radius={[2, 2, 0, 0]} name="Puntos educativos" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
