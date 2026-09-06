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

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface ValuesRadarChartProps {
    data: {
        subject: string;
        A: number;
        fullMark: number;
    }[];
}

export function ValuesRadarChart({ data }: ValuesRadarChartProps) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="rgba(150,170,199,0.18)" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#b8b1a3', fontSize: 12, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 150]}
                        tick={{ fill: 'rgba(150,170,199,0.72)', fontSize: 11 }}
                        axisLine={false}
                    />
                    <Radar
                        name="Puntos"
                        dataKey="A"
                        stroke="#3ddad7"
                        fill="#3ddad7"
                        fillOpacity={0.35}
                        strokeWidth={2}
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
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
