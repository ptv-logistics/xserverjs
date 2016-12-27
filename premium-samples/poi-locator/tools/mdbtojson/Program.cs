using System;
using System.Data.OleDb;
using System.Globalization;
using System.IO;
using System.Reflection;

namespace mdbtojson
{
    class Program
    {
        static void Main(string[] args)
        {
            using (var w = new StreamWriter(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) + "\\json.txt"))
            {
                w.Write(@"{""type"": ""FeatureCollection"", ""features"": ["); // start json

                using (var cn = new OleDbConnection(@"Provider=Microsoft.Jet.OLEDB.4.0;Data Source=|DATADIRECTORY|\Baufeldt.mdb"))
                {
                    cn.Open();
                    using (var cm = new OleDbCommand(String.Format("SELECT ExtId, Longitude, Latitude, Name from Baufeldt"), cn))
                    using (var reader = cm.ExecuteReader())
                    {
                        bool isFirstFeature = true;
                        while (reader.Read())
                        {
                            var name = reader.GetString(0);

                            var id = reader.GetString(0);
                            var x = reader.GetDouble(1);
                            var y = reader.GetDouble(2);
                            var description = reader.GetString(3);

                            if (!isFirstFeature)
                                w.Write(",");

                            string str = string.Format(CultureInfo.InvariantCulture,
                                @"{{""geometry"": {{""type"": ""Point"",""coordinates"": [{1}, {2}]}},""type"": ""Feature"",""id"": ""{0}"",""description"": ""{3}"", ""properties"": []}}",
                                id, x, y, description);

                            w.Write(str);

                            isFirstFeature = false;
                        }


                        reader.Close();

                    }
                    cn.Close();
                }

                w.Write("]}"); // close json
                w.Close();
            }
        }
    }
}
